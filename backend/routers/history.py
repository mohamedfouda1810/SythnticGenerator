"""
History endpoints: list, detail, and delete generation jobs.
Supports user-scoped access (users see own jobs, admins see all).
"""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import GenerationJob, User, UserRole
from backend.services.auth_service import get_current_user_optional

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
async def list_jobs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    mode: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """Return paginated list of generation jobs (user-scoped or all for admin)."""
    offset = (page - 1) * limit

    base_query = select(GenerationJob)

    # User-scope: regular users see only their jobs
    if current_user and current_user.role != UserRole.ADMIN:
        base_query = base_query.where(GenerationJob.user_id == current_user.id)
    elif not current_user:
        # Unauthenticated: show only unowned jobs (backward compat)
        base_query = base_query.where(GenerationJob.user_id.is_(None))

    # Filters
    if mode:
        base_query = base_query.where(GenerationJob.mode == mode)
    if status:
        base_query = base_query.where(GenerationJob.status == status)

    # Count total
    count_stmt = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Fetch page
    stmt = base_query.order_by(GenerationJob.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    jobs = result.scalars().all()

    return {
        "jobs": [
            {
                "id": j.id,
                "mode": j.mode,
                "status": j.status,
                "num_rows_requested": j.num_rows_requested,
                "num_rows_generated": j.num_rows_generated,
                "quality_score": j.quality_score,
                "file_name": j.file_name,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in jobs
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/{job_id}")
async def get_job_detail(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """Return full details for a specific generation job."""
    stmt = select(GenerationJob).where(GenerationJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Access check: user can only view their own jobs
    if current_user and current_user.role != UserRole.ADMIN:
        if job.user_id and job.user_id != current_user.id:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    response = job.to_dict()

    # Parse quality_metrics JSON if present
    if job.quality_metrics:
        try:
            response["quality_metrics"] = json.loads(job.quality_metrics)
        except json.JSONDecodeError:
            response["quality_metrics"] = None

    # Parse schema_used JSON if present
    if job.schema_used:
        try:
            response["schema_used"] = json.loads(job.schema_used)
        except json.JSONDecodeError:
            pass

    return response


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, str]:
    """Delete a generation job record."""
    stmt = select(GenerationJob).where(GenerationJob.id == job_id)
    result = await db.execute(stmt)
    job = result.scalar_one_or_none()

    if job is None:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    # Access check
    if current_user and current_user.role != UserRole.ADMIN:
        if job.user_id and job.user_id != current_user.id:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    await db.delete(job)
    return {"message": f"Job '{job_id}' deleted successfully."}
