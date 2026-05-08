"""
Tests for profile endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def setup_user(client: AsyncClient):
    """Register and login, return auth headers."""
    await client.post("/api/auth/register", json={
        "username": "profileuser",
        "email": "profile@example.com",
        "password": "Profile1234!",
        "confirm_password": "Profile1234!",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "profile@example.com",
        "password": "Profile1234!",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_profile(client: AsyncClient):
    headers = await setup_user(client)
    resp = await client.get("/api/profile", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "profileuser"
    assert data["email"] == "profile@example.com"
    assert "total_generations" in data


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    headers = await setup_user(client)
    resp = await client.patch("/api/profile", headers=headers, json={
        "username": "newname",
    })
    assert resp.status_code == 200
    assert resp.json()["username"] == "newname"


@pytest.mark.asyncio
async def test_update_profile_duplicate_username(client: AsyncClient):
    headers = await setup_user(client)
    # Create second user
    await client.post("/api/auth/register", json={
        "username": "taken",
        "email": "taken@example.com",
        "password": "Taken1234!",
        "confirm_password": "Taken1234!",
    })
    resp = await client.patch("/api/profile", headers=headers, json={
        "username": "taken",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient):
    headers = await setup_user(client)
    resp = await client.patch("/api/profile/password", headers=headers, json={
        "current_password": "Profile1234!",
        "new_password": "NewPass1234!",
        "confirm_password": "NewPass1234!",
    })
    assert resp.status_code == 200

    # Login with new password
    resp2 = await client.post("/api/auth/login", json={
        "email": "profile@example.com",
        "password": "NewPass1234!",
    })
    assert resp2.status_code == 200


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient):
    headers = await setup_user(client)
    resp = await client.patch("/api/profile/password", headers=headers, json={
        "current_password": "WrongPassword!",
        "new_password": "NewPass1234!",
        "confirm_password": "NewPass1234!",
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_account(client: AsyncClient):
    headers = await setup_user(client)
    resp = await client.delete("/api/profile", headers=headers)
    assert resp.status_code == 200

    # Cannot login after deactivation
    resp2 = await client.post("/api/auth/login", json={
        "email": "profile@example.com",
        "password": "Profile1234!",
    })
    assert resp2.status_code == 401
