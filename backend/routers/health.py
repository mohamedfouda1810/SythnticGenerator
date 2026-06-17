"""
Health check endpoint.
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Return application health status including database connectivity."""
    db_status = "unknown"
    db_type = "unknown"

    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
        url = settings.DATABASE_URL
        db_type = "postgresql" if "postgresql" in url else "sqlite"
    except Exception as e:
        db_status = f"error: {str(e)[:100]}"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "version": settings.APP_VERSION,
        "database": db_status,
        "database_type": db_type,
    }
