"""
Application configuration via pydantic-settings.

Loads settings from environment variables and .env file.
"""

from __future__ import annotations

import json
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
# Database
    DATABASE_URL: str = "postgresql+asyncpg://synthgen_user:synthgen_dev_password@127.0.0.1:5432/synthgen"

    # File upload constraints
    MAX_FILE_SIZE_MB: int = 10
    MAX_ROWS: int = 50_000
    ALLOWED_EXTENSIONS: str = "csv,xlsx"

    # CTGAN defaults
    DEFAULT_EPOCHS: int = 100

    # CORS
    CORS_ORIGINS: str = (
        '["http://localhost:3000","http://localhost:5173","http://localhost"]'
    )

    # App metadata
    APP_NAME: str = "Synthetic Data Generator API"
    APP_VERSION: str = "1.0.0"

    # JWT / Auth
    SECRET_KEY: str = "synthgen-dev-secret-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email (empty = console mode, no real email sent)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@synthgen.local"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_USE_TLS: bool = True
    MAIL_USE_SSL: bool = False
    # Frontend URL (for email verification links)
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def max_file_size_bytes(self) -> int:
        """Return max file size in bytes."""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def allowed_extensions_list(self) -> List[str]:
        """Return allowed extensions as a list."""
        return [ext.strip().lower() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string."""
        try:
            return json.loads(self.CORS_ORIGINS)
        except (json.JSONDecodeError, TypeError):
            return ["http://localhost:3000"]


settings = Settings()
