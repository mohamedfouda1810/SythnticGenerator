"""
Tests for health endpoint.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_ok(client: AsyncClient) -> None:
    """Health endpoint returns ok status."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "database" in data


@pytest.mark.asyncio
async def test_health_has_version(client: AsyncClient) -> None:
    """Health endpoint includes version string."""
    resp = await client.get("/health")
    data = resp.json()
    assert data["version"] == "1.0.0"
