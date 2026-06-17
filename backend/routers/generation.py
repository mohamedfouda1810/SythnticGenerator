"""
Generation endpoints: CTGAN, Mimesis, download, and supported fields.

All business logic is delegated to service modules. Routers handle only
HTTP concerns: request parsing, validation, response shaping, and DB updates.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import pandas as pd

import anyio
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db
from backend.models import GenerationJob, GenerationMode, JobStatus, User
from backend.services import ctgan_service, mimesis_service
from backend.services.auth_service import get_client_ip, get_current_user_optional
from backend.services.logger_service import log_activity

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/generate", tags=["generation"])


# ---------------------------------------------------------------------------
# Background Tasks
# ---------------------------------------------------------------------------


async def run_ctgan_task(
    job_id: str,
    file_bytes: bytes,
    filename: str,
    num_rows: int,
    epochs: int,
    remove_pii: bool,
    user_id: Optional[str],
    client_ip: Optional[str],
):
    """
    Background worker that runs the full CTGAN pipeline.
    """
    from backend.database import AsyncSessionLocal
    from sqlalchemy import select
    from backend.models import GenerationJob, JobStatus
    import anyio

    logger.info("Starting background CTGAN job: %s", job_id)

    # 1. First session: Validate job existence
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(GenerationJob).where(GenerationJob.id == job_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            logger.error("Job %s not found. Aborting.", job_id)
            return
    
    # Session is now CLOSED. We can run heavy CPU work without locking the DB.
    try:
        start_time = time.time()

        # 2. Parse uploaded file (offloaded to thread)
        real_df = await anyio.to_thread.run_sync(
            ctgan_service.read_uploaded_file, file_bytes, filename
        )
        logger.info("Job %s: File parsed. DataFrame shape: %s", job_id, real_df.shape)

        # 3. Run full pipeline (preprocess → train → evaluate)
        logger.info("Job %s: Entering CTGAN pipeline...", job_id)
        result_data = await anyio.to_thread.run_sync(
            ctgan_service.run_ctgan_pipeline, real_df, num_rows, epochs, remove_pii
        )
        logger.info("Job %s: CTGAN pipeline finished.", job_id)

        elapsed = round(time.time() - start_time, 2)

        # 4. Second session: Update job with results
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(GenerationJob).where(GenerationJob.id == job_id)
            )
            job = result.scalar_one_or_none()
            if not job:
                logger.warning("Job %s was deleted while training. Discarding results.", job_id)
                return

            job.status = JobStatus.COMPLETED
            job.num_rows_generated = result_data["num_rows_generated"]
            job.quality_score = result_data["quality_score"]
            job.quality_metrics = json.dumps(result_data["quality_metrics"])
            job.download_token = result_data["download_token"]
            job.generation_time_seconds = elapsed
            job.columns_generated = json.dumps(result_data["columns"])
            
            sample_df = result_data["synthetic_df"].head(20).replace({pd.NA: None, float('nan'): None})
            job.synthetic_data_sample = json.dumps(
                sample_df.to_dict(orient="records"),
                default=str,
            )
            job.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

            await log_activity(
                db,
                "generate_ctgan",
                user_id=user_id,
                details={"job_id": job_id, "rows": result_data["num_rows_generated"]},
                ip_address=client_ip,
            )
            await db.commit()
            logger.info("Job %s: SUCCESS in %.2fs", job_id, elapsed)

    except Exception as exc:
        logger.exception("Job %s: FAILED with error: %s", job_id, exc)
        try:
            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(GenerationJob).where(GenerationJob.id == job_id)
                )
                job_err = res.scalar_one_or_none()
                if job_err:
                    job_err.status = JobStatus.FAILED
                    job_err.error_message = str(exc)
                    job_err.completed_at = datetime.now(timezone.utc).replace(
                        tzinfo=None
                    )
                    await db.commit()
        except Exception as e:
            logger.error("Job %s: Could not update error status: %s", job_id, e)


async def run_mimesis_task(
    job_id: str,
    schema: Dict[str, Any],
    num_rows: int,
    locale: str,
    user_id: Optional[str],
    client_ip: Optional[str],
):
    """
    Background worker that runs the Mimesis generation pipeline.
    """
    from backend.database import AsyncSessionLocal
    from sqlalchemy import select
    from backend.models import GenerationJob, JobStatus
    import anyio

    logger.info("Starting background Mimesis job: %s", job_id)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(GenerationJob).where(GenerationJob.id == job_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            return

    try:
        start_time = time.time()

        # Run pipeline in threadpool
        result_data = await anyio.to_thread.run_sync(
            mimesis_service.run_mimesis_pipeline, schema, num_rows, locale
        )

        elapsed = round(time.time() - start_time, 2)

        # Update job
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(GenerationJob).where(GenerationJob.id == job_id)
            )
            job = result.scalar_one_or_none()
            if not job:
                return

            job.status = JobStatus.COMPLETED
            job.num_rows_generated = result_data["num_rows_generated"]
            job.quality_score = result_data["quality_score"]
            job.quality_metrics = json.dumps(result_data["quality_metrics"])
            job.download_token = result_data["download_token"]
            job.generation_time_seconds = elapsed
            job.columns_generated = json.dumps(result_data["columns"])
            
            sample_df = result_data["synthetic_df"].head(20).replace({pd.NA: None, float('nan'): None})
            job.synthetic_data_sample = json.dumps(
                sample_df.to_dict(orient="records"),
                default=str,
            )
            job.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)

            await log_activity(
                db,
                "generate_mimesis",
                user_id=user_id,
                details={"job_id": job_id, "rows": result_data["num_rows_generated"]},
                ip_address=client_ip,
            )
            await db.commit()
            logger.info("Job %s: Mimesis COMPLETED", job_id)

    except Exception as exc:
        logger.exception("Job %s: Mimesis task FAILED", job_id)
        try:
            async with AsyncSessionLocal() as db:
                res = await db.execute(
                    select(GenerationJob).where(GenerationJob.id == job_id)
                )
                job_err = res.scalar_one_or_none()
                if job_err:
                    job_err.status = JobStatus.FAILED
                    job_err.error_message = str(exc)
                    job_err.completed_at = datetime.now(timezone.utc).replace(
                        tzinfo=None
                    )
                    await db.commit()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Pydantic request/response models (API layer)
# ---------------------------------------------------------------------------


class MimesisFieldInput(BaseModel):
    """Single Mimesis field spec from the API consumer."""

    type: str
    options: Dict[str, Any] = Field(default_factory=dict)


class MimesisGenerateRequest(BaseModel):
    """JSON body for POST /api/generate/mimesis."""

    schema_: Dict[str, MimesisFieldInput] = Field(..., alias="schema")
    num_rows: int = Field(default=1000, ge=1)
    locale: str = Field(default="en")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# POST /api/generate/ctgan
# ---------------------------------------------------------------------------


@router.post("/ctgan")
async def generate_ctgan(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    num_rows: int = Form(default=1000),
    epochs: int = Form(default=None),
    remove_pii: bool = Form(default=True),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Generate synthetic data using CTGAN from an uploaded CSV/XLSX file.
    Triggers an asynchronous background task and returns the job ID immediately.
    """
    epochs = epochs or settings.DEFAULT_EPOCHS

    # --- Validate filename ---
    if not file.filename:
        raise HTTPException(status_code=422, detail="Filename is required.")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '.{ext}'. Allowed: {settings.allowed_extensions_list}",
        )

    # --- Validate file size ---
    file_bytes = await file.read()
    if len(file_bytes) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB.",
        )

    # --- Validate num_rows ---
    if num_rows < 1 or num_rows > settings.MAX_ROWS:
        raise HTTPException(
            status_code=422,
            detail=f"num_rows must be between 1 and {settings.MAX_ROWS}.",
        )

    # --- Create job record ---
    job = GenerationJob(
        mode=GenerationMode.CTGAN,
        status=JobStatus.PROCESSING,
        num_rows_requested=num_rows,
        file_name=file.filename,
        user_id=current_user.id if current_user else None,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    job_id = job.id

    # --- Offload to Background Task ---
    background_tasks.add_task(
        run_ctgan_task,
        job_id=job_id,
        file_bytes=file_bytes,
        filename=file.filename,
        num_rows=num_rows,
        epochs=epochs,
        remove_pii=remove_pii,
        user_id=current_user.id if current_user else None,
        client_ip=get_client_ip(request),
    )

    return {
        "job_id": job_id,
        "status": "processing",
        "message": "CTGAN training started in the background.",
    }


# ---------------------------------------------------------------------------
# POST /api/generate/mimesis
# ---------------------------------------------------------------------------


@router.post("/mimesis")
async def generate_mimesis(
    body: MimesisGenerateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Generate synthetic data using Mimesis from a schema definition.
    Triggers an asynchronous background task and returns the job ID immediately.
    """
    # Convert Pydantic models to plain dicts for service layer
    schema = {
        col: {"type": spec.type, "options": spec.options}
        for col, spec in body.schema_.items()
    }
    num_rows = body.num_rows
    locale = body.locale

    # --- Validate num_rows against settings ---
    if num_rows > settings.MAX_ROWS:
        raise HTTPException(
            status_code=422,
            detail=f"num_rows must be between 1 and {settings.MAX_ROWS}.",
        )

    # --- Validate schema fields ---
    errors = mimesis_service.validate_schema(schema)
    if errors:
        raise HTTPException(status_code=422, detail={"validation_errors": errors})

    # --- Create job record ---
    job = GenerationJob(
        mode=GenerationMode.MIMESIS,
        status=JobStatus.PROCESSING,
        num_rows_requested=num_rows,
        schema_used=json.dumps(schema),
        user_id=current_user.id if current_user else None,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    job_id = job.id

    # --- Offload to Background Task ---
    background_tasks.add_task(
        run_mimesis_task,
        job_id=job_id,
        schema=schema,
        num_rows=num_rows,
        locale=locale,
        user_id=current_user.id if current_user else None,
        client_ip=get_client_ip(request),
    )

    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Mimesis generation started in the background.",
    }


# ---------------------------------------------------------------------------
# GET /api/generate/download/{download_token}
# ---------------------------------------------------------------------------


@router.get("/download/{download_token}")
async def download_synthetic_data(
    download_token: str,
    format: str = "csv",
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Download generated synthetic data as CSV or XLSX. Falls back to DB if in-memory expired."""
    import io as _io
    from sqlalchemy import select as _select

    # Try in-memory store first (fast path)
    df = ctgan_service.get_stored_result(download_token)

    # Fallback: reconstruct from DB sample data
    if df is None:
        result = await db.execute(
            _select(GenerationJob).where(GenerationJob.download_token == download_token)
        )
        job = result.scalar_one_or_none()
        if job and job.synthetic_data_sample:
            try:
                sample_data = json.loads(job.synthetic_data_sample)
                df = pd.DataFrame(sample_data)
            except Exception:
                pass

    if df is None or df.empty:
        raise HTTPException(
            status_code=404,
            detail="Download token not found or expired.",
        )

    fname_base = f"synthetic_data_{download_token[:8]}"

    if format.lower() == "xlsx":
        output = _io.BytesIO()
        df.to_excel(output, index=False, engine="openpyxl")
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{fname_base}.xlsx"'
            },
        )

    # Default: CSV
    csv_buffer = df.to_csv(index=False)
    return StreamingResponse(
        iter([csv_buffer]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{fname_base}.csv"'},
    )


# ---------------------------------------------------------------------------
# POST /api/generate/mimesis/preview
# ---------------------------------------------------------------------------


@router.post("/mimesis/preview")
async def preview_mimesis(
    body: MimesisGenerateRequest,
) -> Dict[str, Any]:
    """Generate 3 sample rows from a schema for live preview."""
    schema = {
        col: {"type": spec.type, "options": spec.options}
        for col, spec in body.schema_.items()
    }

    errors = mimesis_service.validate_schema(schema)
    if errors:
        raise HTTPException(status_code=422, detail={"validation_errors": errors})

    try:
        generator = mimesis_service.MimesisGenerator(locale=body.locale)
        sample_df = generator.generate(schema=schema, num_rows=min(body.num_rows, 3))
        return {
            "preview": sample_df.head(3).to_dict(orient="records"),
            "columns": list(sample_df.columns),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Preview failed: {exc}")


# ---------------------------------------------------------------------------
# GET /api/generate/supported-fields
# ---------------------------------------------------------------------------


@router.get("/supported-fields")
async def get_supported_fields() -> Dict[str, Any]:
    """Return all supported Mimesis field types with their options."""
    return {
        "fields": mimesis_service.SUPPORTED_FIELDS,
        "total": len(mimesis_service.SUPPORTED_FIELDS),
    }
