"""
Tests for authentication endpoints.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ─── Helpers ──────────────────────────────────────────────────────

async def register_user(client: AsyncClient, username="testuser", email="test@example.com", password="Test1234!"):
    return await client.post("/api/auth/register", json={
        "username": username,
        "email": email,
        "password": password,
        "confirm_password": password,
    })


async def login_user(client: AsyncClient, email="test@example.com", password="Test1234!"):
    return await client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    })


async def get_auth_header(client: AsyncClient, email="test@example.com", password="Test1234!"):
    resp = await login_user(client, email, password)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─── Register ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await register_user(client)
    assert resp.status_code == 201
    assert resp.json()["message"] == "Registration successful"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await register_user(client)
    resp = await register_user(client, username="other")
    assert resp.status_code == 409
    assert "Email already registered" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    await register_user(client)
    resp = await register_user(client, email="other@example.com")
    assert resp.status_code == 409
    assert "Username already taken" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_password_mismatch(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "Test1234!",
        "confirm_password": "DifferentPassword1!",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "short",
        "confirm_password": "short",
    })
    assert resp.status_code == 422


# ─── Login ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await register_user(client)
    resp = await login_user(client)
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "testuser"
    assert data["user"]["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await register_user(client)
    resp = await login_user(client, password="WrongPassword!")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    resp = await login_user(client, email="nobody@example.com")
    assert resp.status_code == 401


# ─── Protected routes ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient):
    await register_user(client)
    headers = await get_auth_header(client)
    resp = await client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["user"]["username"] == "testuser"


@pytest.mark.asyncio
async def test_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


# ─── Logout ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_logout(client: AsyncClient):
    await register_user(client)
    headers = await get_auth_header(client)
    resp = await client.post("/api/auth/logout", headers=headers)
    assert resp.status_code == 200

    # Token should now be blocklisted
    resp2 = await client.get("/api/auth/me", headers=headers)
    assert resp2.status_code == 401


# ─── Refresh Token ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient):
    await register_user(client)
    login_resp = await login_user(client)
    refresh_token = login_resp.json()["refresh_token"]

    resp = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token,
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


# ─── Forgot / Reset Password ─────────────────────────────────────

@pytest.mark.asyncio
async def test_forgot_reset_password_flow(client: AsyncClient):
    await register_user(client)

    # Forgot password
    forgot_resp = await client.post("/api/auth/forgot-password", json={
        "email": "test@example.com",
    })
    assert forgot_resp.status_code == 200
    reset_token = forgot_resp.json()["reset_token"]

    # Reset password
    reset_resp = await client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewPassword1!",
        "confirm_password": "NewPassword1!",
    })
    assert reset_resp.status_code == 200

    # Login with new password
    login_resp = await login_user(client, password="NewPassword1!")
    assert login_resp.status_code == 200


@pytest.mark.asyncio
async def test_forgot_nonexistent_email(client: AsyncClient):
    resp = await client.post("/api/auth/forgot-password", json={
        "email": "nobody@example.com",
    })
    # Should still return 200 to prevent email enumeration
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_reset_invalid_token(client: AsyncClient):
    resp = await client.post("/api/auth/reset-password", json={
        "token": "invalid-token-uuid",
        "new_password": "NewPassword1!",
        "confirm_password": "NewPassword1!",
    })
    assert resp.status_code == 400
