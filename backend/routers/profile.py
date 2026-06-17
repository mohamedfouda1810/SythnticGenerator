"""
User profile endpoints: view, update, change password, delete account, avatar upload.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models import (
    ActivityLog,
    GenerationJob,
    PasswordResetToken,
    TokenBlocklist,
    User,
    UserRole,
)
from backend.services.auth_service import (
    decode_token,
    get_client_ip,
    get_current_user,
    hash_password,
    verify_password,
)
from backend.services.logger_service import log_activity

router = APIRouter(prefix="/api/profile", tags=["profile"])

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2MB


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    avatar_url: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str


class DeleteAccountRequest(BaseModel):
    password: str


# ─── GET /api/profile ─────────────────────────────────────────────


@router.get("")
async def get_profile(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return current user profile with generation stats."""
    count_result = await db.execute(
        select(func.count())
        .select_from(GenerationJob)
        .where(GenerationJob.user_id == user.id)
    )
    total_generations = count_result.scalar() or 0

    profile = user.to_public_dict()
    profile["total_generations"] = total_generations
    return profile


# ─── PATCH /api/profile ───────────────────────────────────────────


@router.patch("")
async def update_profile(
    body: UpdateProfileRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Update username and/or avatar URL."""
    if body.username and body.username != user.username:
        existing = await db.execute(select(User).where(User.username == body.username))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Username already taken")
        user.username = body.username

    if body.avatar_url is not None:
        user.avatar_url = body.avatar_url

    await log_activity(db, "update_profile", user.id, ip_address=get_client_ip(request))
    await db.commit()

    return user.to_public_dict()


# ─── PATCH /api/profile/password ──────────────────────────────────


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

    await log_activity(
        db, "change_password", user.id, ip_address=get_client_ip(request)
    )
    await db.commit()

    return {"message": "Password changed successfully"}


# ─── DELETE /api/profile — HARD DELETE ────────────────────────────


@router.delete("")
async def delete_account(
    body: DeleteAccountRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """
    Permanently delete account and all associated data.
    Requires password confirmation. Admins cannot self-delete.
    """
    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=403, detail="Admin accounts cannot be self-deleted"
        )

    # Verify password
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    user_id = user.id

    # Blacklist current JWT before deletion
    auth_header = request.headers.get("Authorization", "")
    token_str = auth_header.replace("Bearer ", "")
    try:
        payload = decode_token(token_str)
        jti = payload.get("jti")
        if jti:
            db.add(TokenBlocklist(jti=jti))
    except Exception:
        pass

    # Delete in FK order: logs → reset tokens → jobs → user
    await db.execute(delete(ActivityLog).where(ActivityLog.user_id == user_id))
    await db.execute(
        delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
    )
    await db.execute(delete(GenerationJob).where(GenerationJob.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()

    return {"message": "Account permanently deleted"}


# ─── POST /api/profile/avatar — Upload ────────────────────────────


@router.post("/avatar")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Upload avatar image. Accepts JPEG, PNG, WebP. Max 2MB."""
    if file.content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid file type '{file.content_type}'. Allowed: JPEG, PNG, WebP",
        )

    data = await file.read()
    if len(data) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=413, detail="Avatar must be under 2MB")

    user.avatar_data = data
    user.avatar_mime = file.content_type
    user.avatar_url = None  # Clear URL fallback since we have binary data

    await log_activity(db, "upload_avatar", user.id, ip_address=get_client_ip(request))
    await db.commit()

    return {
        "avatar_url": f"/api/profile/avatar/{user.id}",
        "message": "Avatar uploaded",
    }


# ─── GET /api/profile/avatar/{user_id} — Serve ───────────────────


@router.get("/avatar/{user_id}")
async def get_avatar(
    user_id: str,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Serve user avatar image with caching headers."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.avatar_data:
        raise HTTPException(status_code=404, detail="No avatar found")

    return Response(
        content=user.avatar_data,
        media_type=user.avatar_mime or "image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )
