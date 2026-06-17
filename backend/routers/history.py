"""
History endpoints: list, detail, and delete generation jobs.
Supports user-scoped access (users see own jobs, admins see all).
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import GenerationJob, User, UserRole
from backend.services.auth_service import get_current_user_optional

router = APIRouter(prefix="/api/history", tags=["history"])
logger = logging.getLogger(__name__)


@router.get("")
async def list_jobs(
    response: Response,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    mode: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, Any]:
    """Return paginated list of generation jobs (user-scoped or all for admin)."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
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
    stmt = (
        base_query.order_by(GenerationJob.created_at.desc(), GenerationJob.id.desc())
        .offset(offset)
        .limit(limit)
    )
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

    return job.to_dict()


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> Dict[str, str]:
    """Delete a generation job record."""
    from sqlalchemy import delete as _delete
    
    try:
        # Check existence and ownership first
        stmt = select(GenerationJob).where(GenerationJob.id == job_id)
        result = await db.execute(stmt)
        job = result.scalar_one_or_none()

        if job is None:
            raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

        # Access check
        if current_user and current_user.role != UserRole.ADMIN:
            if job.user_id and job.user_id != current_user.id:
                raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

        # Direct delete
        await db.execute(_delete(GenerationJob).where(GenerationJob.id == job_id))
        await db.commit()
        logger.info("Job %s deleted successfully", job_id)
        
        return {"message": f"Job '{job_id}' deleted successfully."}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error("Failed to delete job %s: %s", job_id, e)
        raise HTTPException(status_code=500, detail="Internal server error during deletion")
