"""
Test fixtures for backend tests.
"""

from __future__ import annotations

import asyncio
import os
import sys
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure project root is on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import Base, get_db
from backend.main import app
from backend.models import User
import backend.database as db_mod

# ─── Database Isolation ──────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create tables before each test, drop after using a unique file per test."""
    db_id = str(uuid.uuid4())
    db_file = f"test_db_{db_id}.sqlite"
    db_url = f"sqlite+aiosqlite:///{db_file}"
    
    engine = create_async_engine(db_url, echo=False)
    session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    # Override globally for this test session
    old_engine = db_mod.engine
    old_factory = db_mod.AsyncSessionLocal
    db_mod.engine = engine
    db_mod.AsyncSessionLocal = session_factory

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Teardown
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()
    
    # Restore global state
    db_mod.engine = old_engine
    db_mod.AsyncSessionLocal = old_factory
    app.dependency_overrides.pop(get_db, None)

    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass


@pytest.fixture(autouse=True)
def mock_settings(monkeypatch):
    """Ensure mail server is disabled during tests."""
    from backend.config import settings
    monkeypatch.setattr(settings, "MAIL_SERVER", "")
    monkeypatch.setattr(settings, "MAIL_USERNAME", "")
    monkeypatch.setattr(settings, "MAIL_PASSWORD", "")


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_csv_bytes() -> bytes:
    """Sample healthcare CSV data as bytes."""
    import numpy as np
    import pandas as pd

    np.random.seed(42)
    n = 50
    df = pd.DataFrame({
        "age": np.random.randint(18, 90, size=n),
        "glucose": np.random.normal(120, 30, size=n).round(1),
        "bmi": np.random.normal(28, 5, size=n).round(2),
        "blood_pressure": np.random.normal(80, 10, size=n).round(0),
        "outcome": np.random.choice([0, 1], size=n),
    })
    return df.to_csv(index=False).encode("utf-8")


@pytest.fixture
def sample_mimesis_schema() -> dict:
    """Sample Mimesis schema for testing."""
    return {
        "schema": {
            "patient_name": {"type": "name", "options": {}},
            "age": {"type": "age", "options": {"min": 18, "max": 80}},
            "diagnosis": {"type": "diagnosis", "options": {}},
            "blood_type": {"type": "blood_type", "options": {}},
        },
        "num_rows": 50,
    }


# ─── Test Helpers: register + verify email + login ────────────────


async def register_and_verify(
    client: AsyncClient,
    username: str = "testuser",
    email: str = "test@example.com",
    password: str = "Test1234!",
) -> dict:
    """Register a user, auto-verify email, and return the register response data."""
    resp = await client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password,
    })
    data = resp.json()

    # Auto-verify via direct DB access
    async with db_mod.AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()
        if user:
            user.is_email_verified = True
            user.email_verification_token = None
            user.email_verification_expires = None
            await session.commit()

    return data


async def get_auth_header(
    client: AsyncClient,
    username: str = "testuser",
    email: str = "test@example.com",
    password: str = "Test1234!",
) -> dict:
    """Register + verify + login, return auth headers."""
    await register_and_verify(client, username, email, password)
    resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
