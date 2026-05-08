"""
FastAPI application entry point.

Initializes the app, CORS, routers, middleware, and database tables.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.config import settings
from backend.database import create_all_tables
from backend.middleware.error_handler import global_exception_handler
from backend.routers import admin, auth, generation, health, history, profile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    """Startup and shutdown events."""
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    await create_all_tables()
    logger.info("Database tables created.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered synthetic data generation platform with CTGAN and Mimesis.",
    lifespan=lifespan,
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global exception handler ---
app.add_exception_handler(Exception, global_exception_handler)

# --- Routers ---
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(generation.router)
app.include_router(history.router)
app.include_router(admin.router)


# --- Request logging middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):  # type: ignore[no-untyped-def]
    """Log every incoming request with timing."""
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "%s %s → %d (%.2fs)",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )
    return response
