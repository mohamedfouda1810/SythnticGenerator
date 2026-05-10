"""
Async SQLAlchemy database setup for SQLite.
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from backend.config import settings

# Engine configuration: Use pooling for PostgreSQL, but avoid it for SQLite in-memory/file if needed.
# create_async_engine handles the driver automatically based on settings.DATABASE_URL.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,  # Check connection health before use
    pool_size=10,        # Max connections in pool
    max_overflow=20,     # Extra connections during bursts
)

async_session_factory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


async def create_all_tables() -> None:
    """Create all tables defined in the ORM models."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI dependency yielding an async DB session."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
