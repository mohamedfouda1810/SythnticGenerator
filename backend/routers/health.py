"""
Health check endpoint.
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter
from sqlalchemy import text

from backend.config import settings
from backend.database import async_session_factory

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """Return application health status including database connectivity."""
    db_status = "connected"
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "app_name": settings.APP_NAME,
        "database": db_status,
    }
