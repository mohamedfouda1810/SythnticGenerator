"""
SQLAlchemy ORM models for the Synthetic Data Generator.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


# ─── Enums ────────────────────────────────────────────────────────


class GenerationMode(str, enum.Enum):
    """Generation mode enum."""

    CTGAN = "ctgan"
    MIMESIS = "mimesis"


class JobStatus(str, enum.Enum):
    """Job status enum."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class UserRole(str, enum.Enum):
    """User role enum."""

    USER = "user"
    ADMIN = "admin"


# ─── User ─────────────────────────────────────────────────────────


class User(Base):
    """Platform user account."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(
        String(30), unique=True, nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum(UserRole), nullable=False, default=UserRole.USER
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)

    # Avatar: URL fallback + binary storage
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    avatar_data: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable=True)
    avatar_mime: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Email verification
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verification_token: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    email_verification_expires: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    jobs: Mapped[list["GenerationJob"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    activity_logs: Mapped[list["ActivityLog"]] = relationship(
        back_populates="user", passive_deletes=True
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "is_blocked": self.is_blocked,
            "avatar_url": self.avatar_url
            or (f"/api/profile/avatar/{self.id}" if self.avatar_data else None),
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url
            or (f"/api/profile/avatar/{self.id}" if self.avatar_data else None),
            "is_email_verified": self.is_email_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
        }


# ─── Password Reset Token ────────────────────────────────────────


class PasswordResetToken(Base):
    """Token for password reset flow."""

    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship(back_populates="reset_tokens")


# ─── Generation Job ──────────────────────────────────────────────


class GenerationJob(Base):
    """Tracks each synthetic data generation request."""

    __tablename__ = "generation_jobs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    mode: Mapped[str] = mapped_column(Enum(GenerationMode), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(JobStatus), nullable=False, default=JobStatus.PENDING
    )
    num_rows_requested: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    num_rows_generated: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    schema_used: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quality_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    quality_metrics: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # New metadata columns
    download_token: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, index=True
    )
    generation_time_seconds: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    columns_generated: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # JSON list
    synthetic_data_sample: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )  # JSON first 20 rows

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped[Optional["User"]] = relationship(back_populates="jobs")

    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        import json as _json

        return {
            "id": self.id,
            "user_id": self.user_id,
            "mode": self.mode,
            "status": self.status,
            "num_rows_requested": self.num_rows_requested,
            "num_rows_generated": self.num_rows_generated,
            "file_name": self.file_name,
            "schema_used": _json.loads(self.schema_used) if self.schema_used else None,
            "quality_score": self.quality_score,
            "quality_metrics": _json.loads(self.quality_metrics)
            if self.quality_metrics
            else None,
            "error_message": self.error_message,
            "download_token": self.download_token,
            "generation_time_seconds": self.generation_time_seconds,
            "columns_generated": _json.loads(self.columns_generated)
            if self.columns_generated
            else None,
            "synthetic_data_sample": _json.loads(self.synthetic_data_sample)
            if self.synthetic_data_sample
            else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat()
            if self.completed_at
            else None,
        }


# ─── Activity Log ────────────────────────────────────────────────


class ActivityLog(Base):
    """System activity log for auditing."""

    __tablename__ = "activity_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="activity_logs")


# ─── Token Blocklist ─────────────────────────────────────────────


class TokenBlocklist(Base):
    """Stores invalidated JWT tokens (for logout)."""

    __tablename__ = "token_blocklist"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    jti: Mapped[str] = mapped_column(
        String(36), nullable=False, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
    )
