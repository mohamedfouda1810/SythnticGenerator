"""
Tests for admin endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from backend.models import User, UserRole
from backend.services.auth_service import hash_password
from backend.tests.conftest import register_and_verify, test_session_factory


# ─── Helpers ──────────────────────────────────────────────────────

async def create_admin(client: AsyncClient):
    """Register a user, verify email, promote to admin via DB, then login."""
    await register_and_verify(client, "admin", "admin@example.com", "Admin1234!")

    # Promote to admin via the test DB
    async with test_session_factory() as session:
        result = await session.execute(select(User).where(User.email == "admin@example.com"))
        user = result.scalar_one()
        user.role = UserRole.ADMIN
        await session.commit()

    resp = await client.post("/api/auth/login", json={
        "email": "admin@example.com",
        "password": "Admin1234!",
    })
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


async def create_regular_user(client: AsyncClient, username="user1", email="user1@example.com"):
    """Register + verify + login a regular user, return login response data."""
    await register_and_verify(client, username, email, "User1234!")
    resp = await client.post("/api/auth/login", json={
        "email": email,
        "password": "User1234!",
    })
    return resp.json()


# ─── Access Control ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_non_admin_cannot_access_admin_routes(client: AsyncClient):
    user_data = await create_regular_user(client)
    headers = {"Authorization": f"Bearer {user_data['access_token']}"}

    resp = await client.get("/api/admin/users", headers=headers)
    assert resp.status_code == 403

    resp = await client.get("/api/admin/stats", headers=headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_cannot_access_admin(client: AsyncClient):
    resp = await client.get("/api/admin/users")
    assert resp.status_code == 401


# ─── User Management ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_users(client: AsyncClient):
    admin_headers = await create_admin(client)
    await create_regular_user(client)

    resp = await client.get("/api/admin/users", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["users"]) >= 2


@pytest.mark.asyncio
async def test_block_unblock_user(client: AsyncClient):
    admin_headers = await create_admin(client)
    user_data = await create_regular_user(client)
    user_id = user_data["user"]["id"]

    # Block
    resp = await client.patch(f"/api/admin/users/{user_id}/block", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_blocked"] is True

    # Blocked user cannot login
    resp = await client.post("/api/auth/login", json={
        "email": "user1@example.com",
        "password": "User1234!",
    })
    assert resp.status_code == 403

    # Unblock
    resp = await client.patch(f"/api/admin/users/{user_id}/block", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["is_blocked"] is False


@pytest.mark.asyncio
async def test_change_role(client: AsyncClient):
    admin_headers = await create_admin(client)
    user_data = await create_regular_user(client)
    user_id = user_data["user"]["id"]

    resp = await client.patch(
        f"/api/admin/users/{user_id}/role",
        headers=admin_headers,
        json={"role": "admin"},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient):
    admin_headers = await create_admin(client)
    user_data = await create_regular_user(client)
    user_id = user_data["user"]["id"]

    resp = await client.delete(f"/api/admin/users/{user_id}", headers=admin_headers)
    assert resp.status_code == 200

    # User no longer exists
    resp = await client.get(f"/api/admin/users/{user_id}", headers=admin_headers)
    assert resp.status_code == 404


# ─── Stats ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stats(client: AsyncClient):
    admin_headers = await create_admin(client)

    resp = await client.get("/api/admin/stats", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "total_generations" in data
    assert "ctgan_count" in data
    assert "mimesis_count" in data


# ─── Logs ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_logs(client: AsyncClient):
    admin_headers = await create_admin(client)

    resp = await client.get("/api/admin/logs", headers=admin_headers)
    assert resp.status_code == 200
    assert "logs" in resp.json()


# ─── Storage Cleanup ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cleanup(client: AsyncClient):
    admin_headers = await create_admin(client)

    resp = await client.delete("/api/admin/storage/cleanup", headers=admin_headers)
    assert resp.status_code == 200
    assert "deleted_files_count" in resp.json()
