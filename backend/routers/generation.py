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
from typing import Any, Dict, List, Optional

import pandas as pd

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
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
    file: UploadFile = File(...),
    num_rows: int = Form(default=1000),
    epochs: int = Form(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Generate synthetic data using CTGAN from an uploaded CSV/XLSX file.
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
    await db.flush()
    job_id = job.id

    try:
        start_time = time.time()

        # Read uploaded file into DataFrame
        real_df = ctgan_service.read_uploaded_file(file_bytes, file.filename)

        # Run full pipeline: preprocess → train CTGAN → evaluate
        result = ctgan_service.run_ctgan_pipeline(real_df, num_rows, epochs)

        elapsed = round(time.time() - start_time, 2)

        # Update job with results
        job.status = JobStatus.COMPLETED
        job.num_rows_generated = result["num_rows_generated"]
        job.quality_score = result["quality_score"]
        job.quality_metrics = json.dumps(result["quality_metrics"])
        job.download_token = result["download_token"]
        job.generation_time_seconds = elapsed
        job.columns_generated = json.dumps(result["columns"])
        job.synthetic_data_sample = json.dumps(
            result["synthetic_df"].head(20).to_dict(orient="records"),
            default=str,
        )
        job.completed_at = datetime.now(timezone.utc)

        await log_activity(
            db, "generate_ctgan",
            user_id=current_user.id if current_user else None,
            details={"job_id": job_id, "rows": result["num_rows_generated"]},
            ip_address=get_client_ip(request),
        )

        return {
            "job_id": job_id,
            "status": "completed",
            "synthetic_data": result["preview"],
            "columns": result["columns"],
            "num_rows_generated": result["num_rows_generated"],
            "quality_metrics": result["quality_metrics"],
            "quality_score": result["quality_score"],
            "download_token": result["download_token"],
            "generation_time_seconds": elapsed,
        }

    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_message = str(exc)
        job.completed_at = datetime.now(timezone.utc)
        logger.error("CTGAN generation failed: %s", exc)
        await log_activity(
            db, "generate_ctgan_error",
            user_id=current_user.id if current_user else None,
            details={"job_id": job_id, "error": str(exc)},
            ip_address=get_client_ip(request),
        )
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}")


# ---------------------------------------------------------------------------
# POST /api/generate/mimesis
# ---------------------------------------------------------------------------

@router.post("/mimesis")
async def generate_mimesis(
    body: MimesisGenerateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """
    Generate synthetic data using Mimesis from a schema definition.
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
    await db.flush()
    job_id = job.id

    try:
        start_time = time.time()

        result = mimesis_service.run_mimesis_pipeline(schema, num_rows, locale)

        elapsed = round(time.time() - start_time, 2)

        job.status = JobStatus.COMPLETED
        job.num_rows_generated = result["num_rows_generated"]
        job.quality_score = result["quality_score"]
        job.quality_metrics = json.dumps(result["quality_metrics"])
        job.download_token = result["download_token"]
        job.generation_time_seconds = elapsed
        job.columns_generated = json.dumps(result["columns"])
        job.synthetic_data_sample = json.dumps(
            result["synthetic_df"].head(20).to_dict(orient="records"),
            default=str,
        )
        job.completed_at = datetime.now(timezone.utc)

        await log_activity(
            db, "generate_mimesis",
            user_id=current_user.id if current_user else None,
            details={"job_id": job_id, "rows": result["num_rows_generated"]},
            ip_address=get_client_ip(request),
        )

        return {
            "job_id": job_id,
            "status": "completed",
            "synthetic_data": result["preview"],
            "columns": result["columns"],
            "num_rows_generated": result["num_rows_generated"],
            "quality_metrics": result["quality_metrics"],
            "quality_score": result["quality_score"],
            "download_token": result["download_token"],
            "generation_time_seconds": elapsed,
        }

    except Exception as exc:
        job.status = JobStatus.FAILED
        job.error_message = str(exc)
        job.completed_at = datetime.now(timezone.utc)
        logger.error("Mimesis generation failed: %s", exc)
        await log_activity(
            db, "generate_mimesis_error",
            user_id=current_user.id if current_user else None,
            details={"job_id": job_id, "error": str(exc)},
            ip_address=get_client_ip(request),
        )
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}")


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
        headers={
            "Content-Disposition": f'attachment; filename="{fname_base}.csv"'
        },
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
