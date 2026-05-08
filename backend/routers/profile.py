"""
User profile endpoints: view, update, change password, delete account.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import GenerationJob, User, UserRole
from backend.services.auth_service import (
    get_client_ip,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.services.logger_service import log_activity

router = APIRouter(prefix="/api/profile", tags=["profile"])


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str


@router.get("")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return current user profile with generation stats."""
    count_result = await db.execute(
        select(func.count()).select_from(GenerationJob).where(
            GenerationJob.user_id == user.id
        )
    )
    total_generations = count_result.scalar() or 0

    profile = user.to_public_dict()
    profile["total_generations"] = total_generations
    return profile


@router.patch("")
async def update_profile(
    body: UpdateProfileRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Update username and/or avatar."""
    if body.username and body.username != user.username:
        existing = await db.execute(
            select(User).where(User.username == body.username)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username already taken")
        user.username = body.username

    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url

    await log_activity(db, "update_profile", user.id, ip_address=get_client_ip(request))

    return user.to_public_dict()


@router.patch("/password")
async def change_password(
    body: ChangePasswordRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Change password (requires current password)."""
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")

    user.hashed_password = hash_password(body.new_password)

    await log_activity(db, "change_password", user.id, ip_address=get_client_ip(request))

    return {"message": "Password changed successfully"}


@router.delete("")
async def delete_account(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Soft-delete account (set is_active=False). Admins cannot self-delete."""
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin accounts cannot be self-deleted")

    user.is_active = False
    await log_activity(db, "delete_account", user.id, ip_address=get_client_ip(request))

    return {"message": "Account deactivated successfully"}
