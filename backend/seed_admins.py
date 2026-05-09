"""
Seed admin accounts into the database.

Can be run standalone: python -m backend.seed_admins
Or called from main.py on first startup.
"""

from __future__ import annotations

import asyncio
import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import async_session_factory, create_all_tables
from backend.models import User, UserRole
from backend.services.auth_service import hash_password

logger = logging.getLogger(__name__)

ADMIN_ACCOUNTS = [
    {
        "username": "admin_habiba",
        "email": "habiba@synthgen.com",
        "password": "Habiba@Admin2025",
    },
    {
        "username": "admin_abdelrahman",
        "email": "abdelrahman@synthgen.com",
        "password": "Abdelrahman@Admin2025",
    },
    {
        "username": "admin_synthgen",
        "email": "admin@synthgen.com",
        "password": "SynthGen@Admin2025",
    },
]


async def seed_admins(db: AsyncSession) -> int:
    """
    Create admin accounts if they don't already exist.
    Returns the number of accounts created.
    """
    created = 0
    for account in ADMIN_ACCOUNTS:
        existing = await db.execute(
            select(User).where(User.email == account["email"])
        )
        if existing.scalar_one_or_none():
            logger.info("Admin '%s' already exists, skipping", account["email"])
            continue

        user = User(
            username=account["username"],
            email=account["email"],
            hashed_password=hash_password(account["password"]),
            role=UserRole.ADMIN,
            is_active=True,
            is_email_verified=True,  # Admins are pre-verified
        )
        db.add(user)
        created += 1
        logger.info("Created admin: %s (%s)", account["username"], account["email"])

    if created:
        await db.commit()
    return created


async def auto_seed_if_no_admins() -> None:
    """Check if any admin users exist; if not, seed default admins."""
    async with async_session_factory() as db:
        count = await db.execute(
            select(func.count()).select_from(User).where(User.role == UserRole.ADMIN)
        )
        admin_count = count.scalar() or 0

        if admin_count == 0:
            logger.info("No admin accounts found. Seeding defaults...")
            created = await seed_admins(db)
            logger.info("✅ Created %d admin accounts on first startup", created)
            _print_credentials()
        else:
            logger.info("Found %d admin account(s), skipping seed.", admin_count)


def _print_credentials() -> None:
    """Print admin credentials to console (first-run only)."""
    print("\n" + "=" * 50)
    print("ADMIN CREDENTIALS (first-run)")
    print("=" * 50)
    for acc in ADMIN_ACCOUNTS:
        print(f"\n  Username : {acc['username']}")
        print(f"  Email    : {acc['email']}")
        print(f"  Password : {acc['password']}")
    print("\n" + "=" * 50)
    print("⚠️  Change these passwords after first login!\n")


# ─── Standalone entry point ───────────────────────────────────────

async def _main() -> None:
    await create_all_tables()
    async with async_session_factory() as db:
        created = await seed_admins(db)
        if created:
            _print_credentials()
        else:
            print("All admin accounts already exist.")


if __name__ == "__main__":
    asyncio.run(_main())
