"""
In-memory storage service for synthetic data results.
Provides thread-safe storage and auto-cleanup of DataFrames.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from typing import Dict, Optional, Tuple

import pandas as pd

logger = logging.getLogger(__name__)

# In-memory store: token → (DataFrame, timestamp)
_result_store: Dict[str, Tuple[pd.DataFrame, float]] = {}
_store_lock = threading.Lock()
RESULT_TTL_SECONDS: int = 3600  # 1 hour


def cleanup_expired() -> None:
    """Remove results older than TTL."""
    now = time.time()
    with _store_lock:
        expired = [
            k for k, (_, ts) in _result_store.items() if now - ts > RESULT_TTL_SECONDS
        ]
        for k in expired:
            del _result_store[k]
        if expired:
            logger.info("Storage cleanup: removed %d expired results.", len(expired))


def store_result(df: pd.DataFrame) -> str:
    """Store a DataFrame and return a download token."""
    cleanup_expired()
    token = str(uuid.uuid4())
    with _store_lock:
        _result_store[token] = (df, time.time())
    return token


def get_stored_result(token: str) -> Optional[pd.DataFrame]:
    """Retrieve a stored DataFrame by token."""
    with _store_lock:
        entry = _result_store.get(token)
        if entry:
            return entry[0]
    return None


def get_store_size() -> int:
    """Return number of items in store."""
    with _store_lock:
        return len(_result_store)
