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
from sqlalchemy import text
from backend.database import create_tables, engine
from backend.middleware.error_handler import global_exception_handler
from backend.routers import admin, auth, generation, health, history, profile

# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# --- Lifespan Events (Startup / Shutdown) ---
@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
    """Startup and shutdown events."""
    
    # 🚨 سطر الفحص السحري - لمعرفة الرابط الفعلي المقروء عند بدء التشغيل
    logger.error("==================================================")
    logger.error(f"🚨 DEBUG: DATABASE_URL IS CURRENTLY: {settings.DATABASE_URL}")
    logger.error("==================================================")

    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)

    # Test database connection
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection: OK")
        db_ok = True
    except Exception as e:
        logger.error(f"Database connection FAILED: {e}")
        logger.error("Check DATABASE_URL in your .env file")
        # Don't crash — allow app to start so /health shows the error

    if db_ok:
        # Create tables only if connection is successful
        await create_tables()
        
        # Seed admins
        from backend.seed_admins import auto_seed_if_no_admins
        await auto_seed_if_no_admins()

    yield
    logger.info("Shutting down.")


# --- FastAPI App Initialization ---
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered synthetic data generation platform with CTGAN and Mimesis.",
    lifespan=lifespan,
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Exception Handler ---
app.add_exception_handler(Exception, global_exception_handler)

# --- Routers ---
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(generation.router)
app.include_router(history.router)
app.include_router(admin.router)


# --- Request Logging Middleware ---
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