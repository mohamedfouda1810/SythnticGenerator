"""
Tests for history endpoints: listing, detail, delete, pagination.

Covers:
- Empty history
- History after generation (Mimesis)
- Job detail with parsed quality_metrics and schema_used
- 404 for nonexistent jobs
- Job deletion and verification
- Pagination logic (page/limit/pages)
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_empty_history(client: AsyncClient) -> None:
    """GET /api/history with no jobs returns empty list."""
    resp = await client.get("/api/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data["jobs"] == []
    assert data["total"] == 0
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_history_after_generation(
    client: AsyncClient, sample_mimesis_schema: dict
) -> None:
    """After generating data, history should contain the job."""
    # Generate
    gen_resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
    assert gen_resp.status_code == 200
    job_id = gen_resp.json()["job_id"]

    # List
    resp = await client.get("/api/history")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["jobs"][0]["id"] == job_id
    assert data["jobs"][0]["mode"] == "mimesis"
    assert data["jobs"][0]["status"] == "completed"


@pytest.mark.asyncio
async def test_history_detail(
    client: AsyncClient, sample_mimesis_schema: dict
) -> None:
    """GET /api/history/{job_id} returns full job details."""
    gen_resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
    job_id = gen_resp.json()["job_id"]

    resp = await client.get(f"/api/history/{job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == job_id
    assert data["num_rows_requested"] == 50
    assert data["num_rows_generated"] == 50
    assert data["schema_used"] is not None
    # schema_used should be parsed from JSON string into dict
    assert isinstance(data["schema_used"], dict)


@pytest.mark.asyncio
async def test_history_detail_not_found(client: AsyncClient) -> None:
    """GET /api/history/{bad_id} returns 404."""
    resp = await client.get("/api/history/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_history_detail_fields(
    client: AsyncClient, sample_mimesis_schema: dict
) -> None:
    """Job detail includes all expected fields."""
    gen_resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
    job_id = gen_resp.json()["job_id"]

    resp = await client.get(f"/api/history/{job_id}")
    data = resp.json()

    expected_keys = {
        "id", "mode", "status", "num_rows_requested",
        "num_rows_generated", "file_name", "schema_used",
        "quality_score", "quality_metrics", "error_message",
        "created_at", "completed_at",
    }
    assert expected_keys.issubset(set(data.keys()))


@pytest.mark.asyncio
async def test_delete_job(
    client: AsyncClient, sample_mimesis_schema: dict
) -> None:
    """DELETE /api/history/{job_id} removes the job."""
    gen_resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
    job_id = gen_resp.json()["job_id"]

    del_resp = await client.delete(f"/api/history/{job_id}")
    assert del_resp.status_code == 200
    assert "deleted" in del_resp.json()["message"]

    # Verify gone
    resp = await client.get(f"/api/history/{job_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_nonexistent(client: AsyncClient) -> None:
    """DELETE /api/history/{bad_id} returns 404."""
    resp = await client.delete("/api/history/nonexistent-id")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_history_pagination(
    client: AsyncClient, sample_mimesis_schema: dict
) -> None:
    """Pagination returns correct page/limit."""
    # Generate 3 jobs
    for _ in range(3):
        await client.post("/api/generate/mimesis", json=sample_mimesis_schema)

    # Page 1 with limit 2
    resp = await client.get("/api/history?page=1&limit=2")
    data = resp.json()
    assert len(data["jobs"]) == 2
    assert data["total"] == 3
    assert data["pages"] == 2

    # Page 2 with limit 2
    resp = await client.get("/api/history?page=2&limit=2")
    data = resp.json()
    assert len(data["jobs"]) == 1


@pytest.mark.asyncio
async def test_history_default_pagination(client: AsyncClient, sample_mimesis_schema: dict) -> None:
    """Default pagination params work correctly."""
    await client.post("/api/generate/mimesis", json=sample_mimesis_schema)

    resp = await client.get("/api/history")
    data = resp.json()
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["pages"] >= 1


@pytest.mark.asyncio
async def test_history_ordering(client: AsyncClient, sample_mimesis_schema: dict) -> None:
    """Jobs should be ordered by created_at descending (newest first)."""
    job_ids = []
    for _ in range(3):
        resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
        job_ids.append(resp.json()["job_id"])

    resp = await client.get("/api/history")
    data = resp.json()
    listed_ids = [j["id"] for j in data["jobs"]]
    # Most recently created should be first
    assert listed_ids == list(reversed(job_ids))
