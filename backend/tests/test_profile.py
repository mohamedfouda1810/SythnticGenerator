"""
Tests for profile endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from backend.tests.conftest import get_auth_header, register_and_verify


async def setup_user(client: AsyncClient):
    """Register, verify, and login, return auth headers."""
    return await get_auth_header(client, "profileuser", "profile@example.com", "Profile1234!")


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
    await register_and_verify(client, "taken", "taken@example.com", "Taken1234!")
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
    """Hard delete: password confirmation required, re-registration works."""
    headers = await setup_user(client)
    resp = await client.request(
        "DELETE", "/api/profile", headers=headers,
        json={"password": "Profile1234!"},
    )
    assert resp.status_code == 200
    assert "permanently deleted" in resp.json()["message"]

    # Cannot login after deletion
    resp2 = await client.post("/api/auth/login", json={
        "email": "profile@example.com",
        "password": "Profile1234!",
    })
    assert resp2.status_code == 401

    # Re-registration with same email works
    resp3 = await client.post("/api/auth/register", json={
        "username": "profileuser2",
        "email": "profile@example.com",
        "password": "Profile1234!",
        "confirm_password": "Profile1234!",
    })
    assert resp3.status_code == 201


@pytest.mark.asyncio
async def test_delete_account_wrong_password(client: AsyncClient):
    """Delete should fail with wrong password."""
    headers = await setup_user(client)
    resp = await client.request(
        "DELETE", "/api/profile", headers=headers,
        json={"password": "WrongPassword!"},
    )
    assert resp.status_code == 400
