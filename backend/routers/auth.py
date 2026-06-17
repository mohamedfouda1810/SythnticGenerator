"""
Authentication endpoints: register, login, logout, refresh, forgot/reset password,
email verification, and me.
"""

from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
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
    verify_password,
    verify_token,
)
from backend.services.email_service import send_verification_email
from backend.services.logger_service import log_activity

logger = logging.getLogger(__name__)
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


def normalize_email(email: str) -> str:
    """Normalize and validate an email address from an auth request."""
    normalized = email.strip().lower()
    if not EMAIL_REGEX.match(normalized):
        raise HTTPException(status_code=422, detail="Invalid email format")
    return normalized


# ─── Endpoints ────────────────────────────────────────────────────


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Register a new user account with email verification."""
    email = normalize_email(body.email)

    # Validate passwords match
    if body.password != body.confirm_password:
        raise HTTPException(status_code=422, detail="Passwords do not match")

    # Check unique email
    result = await db.execute(select(User).where(User.email == email))
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
        email=email,
        hashed_password=hash_password(body.password),
        is_email_verified=False,
        email_verification_token=raw_token,
        email_verification_expires=datetime.now(timezone.utc).replace(tzinfo=None)
        + timedelta(hours=24),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await log_activity(
        db, "register", user.id, {"username": body.username}, get_client_ip(request)
    )
    await db.commit()

    # Send verification email
    background_tasks.add_task(
        send_verification_email, email, body.username, raw_token
    )

    # Always log the verify URL to the server console as a reliable fallback
    _verify_url = f"{settings.FRONTEND_URL}/verify-email?token={raw_token}&email={email}"
    logger.info("─" * 60)
    logger.info("NEW REGISTRATION — verification link (server console fallback):")
    logger.info("  User : %s (%s)", body.username, email)
    logger.info("  URL  : %s", _verify_url)
    logger.info("─" * 60)

    return {
        "message": "Registration successful. Please check your email to verify your account.",
        "email": email,
    }



@router.post("/login")
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Authenticate user and return tokens."""
    email = normalize_email(body.email)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account deactivated")

    if user.is_blocked:
        raise HTTPException(status_code=403, detail="Account blocked by admin")

    # Check email verification
    logger.info(
        "Login attempt for %s. Verified: %s", user.email, user.is_email_verified
    )
    if not user.is_email_verified:
        logger.warning("Blocked login for unverified user: %s", user.email)
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
    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)

    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id)

    await log_activity(db, "login", user.id, ip_address=get_client_ip(request))
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user.to_public_dict(),
    }


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """
    Logout by blocklisting the current token.
    Always returns 200 — even if the token is expired or missing,
    the client is effectively logged out.
    """
    auth_header = request.headers.get("Authorization", "")
    raw_token = auth_header.removeprefix("Bearer ").strip()

    if raw_token:
        try:
            payload = decode_token(raw_token)
            jti = payload.get("jti")
            user_id = payload.get("sub")
            if jti:
                # Avoid duplicate blocklist entries
                existing = await db.execute(
                    select(TokenBlocklist).where(TokenBlocklist.jti == jti)
                )
                if not existing.scalar_one_or_none():
                    db.add(TokenBlocklist(jti=jti))
            if user_id:
                await log_activity(
                    db, "logout", user_id, ip_address=get_client_ip(request)
                )
            await db.commit()
        except Exception:
            # Token expired or invalid — client is logging out anyway, ignore
            pass

    return {"message": "Logged out successfully"}


@router.post("/refresh")
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """
    Exchange a valid refresh token for a new access token.
    Refresh token can be in:
    - Cookie: refresh_token
    - Body: { "refresh_token": "..." }
    """
    # Try cookie first, then body
    refresh_token = request.cookies.get("refresh_token")

    if not refresh_token:
        try:
            # Note: request.json() can only be called once or we need to manage state
            body = await request.json()
            refresh_token = body.get("refresh_token")
        except Exception:
            pass

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided",
        )

    # Verify token
    try:
        payload = verify_token(refresh_token, token_type="refresh")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(401, "Invalid or expired refresh token")

    # Get user
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_active == True,  # noqa: E712
            User.is_blocked == False,  # noqa: E712
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found or inactive")

    # Issue new access token
    new_access_token = create_access_token(user.id, user.role)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Generate a password reset token."""
    email = normalize_email(body.email)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}

    raw_token = str(uuid.uuid4())
    reset = PasswordResetToken(
        user_id=user.id,
        token=hash_password(raw_token),
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1),
    )
    db.add(reset)
    await db.commit()

    await log_activity(
        db, "forgot_password", user.id, ip_address=get_client_ip(request)
    )
    await db.commit()

    # TODO: Send password reset email here (email_service.send_reset_email)
    return {
        "message": "If the email exists, a reset link has been sent",
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
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    token_result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.used == False,  # noqa: E712
            PasswordResetToken.expires_at > now,
        )
    )
    tokens = token_result.scalars().all()

    valid_token = None
    for t in tokens:
        if verify_password(body.token, t.token):
            valid_token = t
            break

    if not valid_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    # Update password
    user_result = await db.execute(select(User).where(User.id == valid_token.user_id))
    target_user: Optional[User] = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_user.hashed_password = hash_password(body.new_password)
    valid_token.used = True

    await log_activity(
        db, "reset_password", target_user.id, ip_address=get_client_ip(request)
    )
    await db.commit()

    return {"message": "Password reset successfully"}


# ─── Email Verification ──────────────────────────────────────────


@router.get("/verify-email")
async def verify_email(
    request: Request,
    token: str = Query(...),
    email: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Verify email address using token from verification email."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    normalized_email = normalize_email(email) if email else None

    # 1. If email is provided, check if already verified
    if normalized_email:
        res = await db.execute(select(User).where(User.email == normalized_email))
        user_by_email = res.scalar_one_or_none()
        if user_by_email and user_by_email.is_email_verified:
            return {
                "message": "Email already verified",
                "username": user_by_email.username,
                "already_verified": True,
            }

    # 2. Find user with matching unexpired verification token
    result = await db.execute(
        select(User).where(
            User.email_verification_token == token,
            User.email_verification_expires > now,
        )
    )
    verified_user = result.scalar_one_or_none()

    if not verified_user:
        raise HTTPException(
            status_code=400, detail="Invalid or expired verification link"
        )

    verified_user.is_email_verified = True
    verified_user.email_verification_token = None
    verified_user.email_verification_expires = None
    await log_activity(
        db,
        "verify_email",
        verified_user.id,
        ip_address=get_client_ip(request),
    )
    await db.commit()

    return {
        "message": "Email verified successfully",
        "username": verified_user.username,
    }


@router.post("/resend-verification")
async def resend_verification(
    body: ResendVerificationRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Resend email verification link."""
    email = normalize_email(body.email)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or user.is_email_verified:
        # Don't reveal if email exists
        return {
            "message": "If the email exists and is unverified, a new link has been sent"
        }

    # Generate new token
    raw_token = str(uuid.uuid4())
    user.email_verification_token = raw_token
    user.email_verification_expires = datetime.now(timezone.utc).replace(
        tzinfo=None
    ) + timedelta(hours=24)
    await log_activity(
        db,
        "resend_verification",
        user.id,
        ip_address=get_client_ip(request),
    )
    await db.commit()

    background_tasks.add_task(
        send_verification_email, user.email, user.username, raw_token
    )

    return {
        "message": "Verification email resent. Please check your inbox.",
    }


@router.get("/me")
async def get_me(
    user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return current authenticated user profile."""
    return {"user": user.to_public_dict()}
