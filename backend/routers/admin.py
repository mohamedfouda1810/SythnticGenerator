"""
Admin panel endpoints: user management, stats, logs, errors, storage cleanup.

All endpoints require admin role.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import (
    ActivityLog,
    GenerationJob,
    GenerationMode,
    JobStatus,
    User,
    UserRole,
)
from backend.services.auth_service import get_client_ip, require_admin
from backend.services.logger_service import log_activity

router = APIRouter(prefix="/api/admin", tags=["admin"])


class ChangeRoleRequest(BaseModel):
    role: str


# ─── User Management ─────────────────────────────────────────────

@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_blocked: Optional[bool] = None,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """List all users with filters and pagination."""
    query = select(User)

    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if is_blocked is not None:
        query = query.where(User.is_blocked == is_blocked)
    if search:
        query = query.where(
            (User.username.ilike(f"%{search}%")) | (User.email.ilike(f"%{search}%"))
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Fetch page
    offset = (page - 1) * limit
    users_result = await db.execute(
        query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    )
    users = users_result.scalars().all()

    # Get generation counts per user
    user_ids = [u.id for u in users]
    gen_counts = {}
    if user_ids:
        gc_result = await db.execute(
            select(
                GenerationJob.user_id,
                func.count(GenerationJob.id).label("count"),
            )
            .where(GenerationJob.user_id.in_(user_ids))
            .group_by(GenerationJob.user_id)
        )
        gen_counts = {row.user_id: row.count for row in gc_result}

    return {
        "users": [
            {**u.to_dict(), "generation_count": gen_counts.get(u.id, 0)}
            for u in users
        ],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Get full user details with generation history."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    jobs_result = await db.execute(
        select(GenerationJob)
        .where(GenerationJob.user_id == user_id)
        .order_by(GenerationJob.created_at.desc())
        .limit(20)
    )
    jobs = jobs_result.scalars().all()

    return {
        "user": user.to_dict(),
        "recent_jobs": [j.to_dict() for j in jobs],
        "generation_count": len(jobs),
    }


@router.patch("/users/{user_id}/block")
async def toggle_block(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Toggle user blocked status."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    user.is_blocked = not user.is_blocked
    action = "block_user" if user.is_blocked else "unblock_user"
    await log_activity(db, action, admin.id, {"target_user": user_id}, get_client_ip(request))

    return {"user_id": user_id, "is_blocked": user.is_blocked, "message": f"User {'blocked' if user.is_blocked else 'unblocked'}"}


@router.patch("/users/{user_id}/role")
async def change_role(
    user_id: str,
    body: ChangeRoleRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Change user role."""
    if body.role not in [UserRole.USER, UserRole.ADMIN]:
        raise HTTPException(status_code=422, detail="Invalid role")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = body.role
    await log_activity(db, "change_role", admin.id, {"target_user": user_id, "new_role": body.role}, get_client_ip(request))

    return {"user_id": user_id, "role": body.role, "message": "Role updated"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Hard delete user and their generation history."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await log_activity(db, "delete_user", admin.id, {"target_user": user_id}, get_client_ip(request))

    return {"message": f"User '{user_id}' deleted"}


# ─── Stats ────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Dashboard statistics."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())

    # User stats
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    active_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)  # noqa
    )).scalar() or 0
    blocked_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_blocked == True)  # noqa
    )).scalar() or 0

    # Job stats
    total_gens = (await db.execute(select(func.count()).select_from(GenerationJob))).scalar() or 0
    ctgan_count = (await db.execute(
        select(func.count()).select_from(GenerationJob).where(GenerationJob.mode == GenerationMode.CTGAN)
    )).scalar() or 0
    mimesis_count = (await db.execute(
        select(func.count()).select_from(GenerationJob).where(GenerationJob.mode == GenerationMode.MIMESIS)
    )).scalar() or 0
    completed_count = (await db.execute(
        select(func.count()).select_from(GenerationJob).where(GenerationJob.status == JobStatus.COMPLETED)
    )).scalar() or 0
    failed_count = (await db.execute(
        select(func.count()).select_from(GenerationJob).where(GenerationJob.status == JobStatus.FAILED)
    )).scalar() or 0
    gens_today = (await db.execute(
        select(func.count()).select_from(GenerationJob).where(GenerationJob.created_at >= today_start)
    )).scalar() or 0
    gens_week = (await db.execute(
        select(func.count()).select_from(GenerationJob).where(GenerationJob.created_at >= week_start)
    )).scalar() or 0
    avg_quality = (await db.execute(
        select(func.avg(GenerationJob.quality_score)).where(GenerationJob.quality_score.isnot(None))
    )).scalar()

    # Top users
    top_result = await db.execute(
        select(
            User.username,
            func.count(GenerationJob.id).label("count"),
        )
        .join(GenerationJob, GenerationJob.user_id == User.id)
        .group_by(User.username)
        .order_by(func.count(GenerationJob.id).desc())
        .limit(5)
    )
    top_users = [{"username": r.username, "generation_count": r.count} for r in top_result]

    return {
        "total_users": total_users,
        "active_users": active_users,
        "blocked_users": blocked_users,
        "total_generations": total_gens,
        "ctgan_count": ctgan_count,
        "mimesis_count": mimesis_count,
        "completed_count": completed_count,
        "failed_count": failed_count,
        "generations_today": gens_today,
        "generations_this_week": gens_week,
        "avg_quality_score": round(avg_quality, 1) if avg_quality else None,
        "top_users": top_users,
    }


# ─── Activity Logs ────────────────────────────────────────────────

@router.get("/logs")
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    user_id: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Paginated activity logs."""
    query = select(ActivityLog)
    if action:
        query = query.where(ActivityLog.action == action)
    if user_id:
        query = query.where(ActivityLog.user_id == user_id)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(ActivityLog.timestamp.desc()).offset(offset).limit(limit)
    )
    logs = result.scalars().all()

    return {
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "details": json.loads(log.details) if log.details else None,
                "ip_address": log.ip_address,
                "timestamp": log.timestamp.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }


# ─── Error Reports ────────────────────────────────────────────────

@router.get("/errors")
async def get_errors(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """List failed generation jobs."""
    query = select(GenerationJob).where(GenerationJob.status == JobStatus.FAILED)
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(GenerationJob.created_at.desc()).offset(offset).limit(limit)
    )
    jobs = result.scalars().all()

    return {
        "errors": [j.to_dict() for j in jobs],
        "total": total,
        "page": page,
        "pages": max(1, (total + limit - 1) // limit),
    }


# ─── Storage Cleanup ──────────────────────────────────────────────

@router.delete("/storage/cleanup")
async def run_cleanup(
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Cleanup expired in-memory results."""
    from backend.services.ctgan_service import _cleanup_expired, _result_store

    before = len(_result_store)
    _cleanup_expired()
    after = len(_result_store)

    await log_activity(db, "storage_cleanup", admin.id, {"deleted": before - after}, get_client_ip(request))

    return {
        "deleted_files_count": before - after,
        "remaining": after,
        "message": "Cleanup complete",
    }
