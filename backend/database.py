from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings
import logging

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


# Build engine based on DATABASE_URL
# Support both SQLite (dev) and PostgreSQL (prod)
def create_engine_from_url(url: str):
    if url.startswith("sqlite"):
        return create_async_engine(
            url, echo=False, connect_args={"check_same_thread": False}
        )
    else:
        # PostgreSQL with connection pooling
        return create_async_engine(
            url,
            echo=False,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600,
        )


engine = create_engine_from_url(settings.DATABASE_URL)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created/verified.")
