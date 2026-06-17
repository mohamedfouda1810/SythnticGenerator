"""
Activity logging service.

Records user actions for auditing and admin dashboard.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from backend.models import ActivityLog

logger = logging.getLogger(__name__)


async def log_activity(
    db: AsyncSession,
    action: str,
    user_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> None:
    """Record an activity log entry."""
    try:
        entry = ActivityLog(
            user_id=user_id,
            action=action,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
        )
        db.add(entry)
        await db.flush()
    except Exception as exc:
        logger.warning("Failed to log activity: %s", exc)
