"""
Global error handler middleware.

Catches unhandled exceptions and returns consistent JSON error responses.
"""

from __future__ import annotations

import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


class GenerationError(Exception):
    """Custom exception for generation failures."""

    def __init__(self, message: str, detail: str = "") -> None:
        self.message = message
        self.detail = detail
        super().__init__(message)


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle any unhandled exception with a consistent JSON format."""
    if isinstance(exc, ValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": "ValidationError",
                "message": "Request validation failed.",
                "detail": exc.errors(),
            },
        )

    if isinstance(exc, GenerationError):
        return JSONResponse(
            status_code=500,
            content={
                "error": "GenerationError",
                "message": exc.message,
                "detail": exc.detail,
            },
        )

    if isinstance(exc, FileNotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "error": "FileNotFoundError",
                "message": str(exc),
                "detail": "",
            },
        )

    if isinstance(exc, ValueError):
        return JSONResponse(
            status_code=400,
            content={
                "error": "ValueError",
                "message": str(exc),
                "detail": "",
            },
        )

    if isinstance(exc, MemoryError):
        return JSONResponse(
            status_code=507,
            content={
                "error": "MemoryError",
                "message": "Server ran out of memory processing this request.",
                "detail": "",
            },
        )

    # Fallback for unexpected errors
    logger.error("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred.",
            "detail": str(exc) if logger.isEnabledFor(logging.DEBUG) else "",
        },
    )
