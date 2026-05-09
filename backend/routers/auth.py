"""
Authentication endpoints: register, login, logout, refresh, forgot/reset password,
email verification, and me.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db
from backend.models import PasswordResetToken, TokenBlocklist, User
from backend.services.auth_service import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_client_ip,
    get_current_user,
    hash_password,
    security,
    verify_password,
)
from backend.services.email_service import send_verification_email, _is_email_configured
from backend.services.logger_service import log_activity

router = APIRouter(prefix="/api/auth", tags=["auth"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


# ─── Request schemas ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: str
    password: str = Field(..., min_length=8)
    confirm_password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ResendVerificationRequest(BaseModel):
    email: str


# ─── Endpoints ────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Register a new user account with email verification."""
    # Validate email format
    if not EMAIL_REGEX.match(body.email):
        raise HTTPException(status_code=422, detail="Invalid email format")

    # Validate passwords match
    if body.password != body.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")

    # Check unique email
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    # Check unique username
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")

    # Generate email verification token
    raw_token = str(uuid.uuid4())

    user = User(
        username=body.username,
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        is_email_verified=False,
        email_verification_token=hash_password(raw_token),
        email_verification_expires=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(user)
    await db.flush()

    await log_activity(db, "register", user.id, {"username": body.username}, get_client_ip(request))

    # Send verification email
    send_verification_email(body.email.lower(), body.username, raw_token)

    # Build response
    response_data = {
        "message": "Registration successful. Please verify your email.",
        "email": body.email.lower(),
    }

    # In dev mode (no SMTP), include token so frontend can show a direct verify link
    if not _is_email_configured():
        response_data["dev_mode"] = True
        response_data["dev_token"] = raw_token
        response_data["dev_verify_url"] = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"

    return response_data


@router.post("/login")
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Authenticate user and return tokens."""
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account deactivated")

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Account blocked by admin")

    # Check email verification
    if not user.is_email_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "email_not_verified",
                "message": "Please verify your email first",
                "email": user.email,
                "can_resend": True,
            },
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    await log_activity(db, "login", user.id, ip_address=get_client_ip(request))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user.to_public_dict(),
    }


@router.post("/logout")
async def logout(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Logout by blocklisting the current token."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")

    try:
        payload = decode_token(token)
        jti = payload.get("jti")
        if jti:
            db.add(TokenBlocklist(jti=jti))
            await db.flush()
    except Exception:
        pass

    await log_activity(db, "logout", user.id, ip_address=get_client_ip(request))

    return {"message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Exchange a refresh token for a new access token."""
    payload = decode_token(body.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access = create_access_token(user.id, user.role)
    return {"access_token": new_access, "token_type": "bearer"}


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Generate a password reset token."""
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}

    raw_token = str(uuid.uuid4())
    reset = PasswordResetToken(
        user_id=user.id,
        token=hash_password(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(reset)
    await db.flush()

    await log_activity(db, "forgot_password", user.id, ip_address=get_client_ip(request))

    # In production, send email. For dev, return token directly.
    return {
        "message": "If the email exists, a reset link has been sent",
        "reset_token": raw_token,  # DEV ONLY
    }


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Reset password using a valid reset token."""
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")

    # Find valid tokens
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.used == False,  # noqa: E712
            PasswordResetToken.expires_at > now,
        )
    )
    tokens = result.scalars().all()

    valid_token = None
    for t in tokens:
        if verify_password(body.token, t.token):
            valid_token = t
            break

    if not valid_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Update password
    result = await db.execute(select(User).where(User.id == valid_token.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(body.new_password)
    valid_token.used = True

    await log_activity(db, "reset_password", user.id, ip_address=get_client_ip(request))

    return {"message": "Password reset successfully"}


# ─── Email Verification ──────────────────────────────────────────

@router.get("/verify-email")
async def verify_email(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Verify email address using token from verification email."""
    now = datetime.now(timezone.utc)

    # Find users with unexpired verification tokens
    result = await db.execute(
        select(User).where(
            User.is_email_verified == False,  # noqa: E712
            User.email_verification_token.isnot(None),
            User.email_verification_expires > now,
        )
    )
    users = result.scalars().all()

    verified_user = None
    for u in users:
        if verify_password(token, u.email_verification_token):
            verified_user = u
            break

    if not verified_user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    verified_user.is_email_verified = True
    verified_user.email_verification_token = None
    verified_user.email_verification_expires = None

    return {
        "message": "Email verified successfully",
        "username": verified_user.username,
    }


@router.post("/resend-verification")
async def resend_verification(
    body: ResendVerificationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Resend email verification link."""
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or user.is_email_verified:
        # Don't reveal if email exists
        return {"message": "If the email exists and is unverified, a new link has been sent"}

    # Generate new token
    raw_token = str(uuid.uuid4())
    user.email_verification_token = hash_password(raw_token)
    user.email_verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)

    send_verification_email(user.email, user.username, raw_token)

    # Build response
    response_data = {
        "message": "Verification email resent",
    }

    if not _is_email_configured():
        response_data["dev_mode"] = True
        response_data["dev_token"] = raw_token
        response_data["dev_verify_url"] = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}"

    return response_data


@router.get("/me")
async def get_me(
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return current authenticated user profile."""
    return {"user": user.to_public_dict()}
