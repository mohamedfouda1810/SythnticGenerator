"""
Test fixtures for backend tests.
"""

from __future__ import annotations

import asyncio
import os
import sys
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure project root is on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.database import Base, get_db
from backend.main import app

# Test database - in-memory SQLite
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
test_session_factory = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    """Override DB dependency for tests."""
    async with test_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    """Create tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


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
