"""
Tests for generation endpoints (CTGAN, Mimesis, download, supported-fields).

Covers:
- Happy paths (correct input → 200)
- Validation errors (wrong file type → 422, wrong schema → 422)
- Large file rejection (→ 413)
- Download with valid/invalid tokens
- Full end-to-end integration for both pipelines
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


# ── Supported Fields ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_supported_fields(client: AsyncClient) -> None:
    """GET /api/generate/supported-fields returns field list."""
    resp = await client.get("/api/generate/supported-fields")
    assert resp.status_code == 200
    data = resp.json()
    assert "fields" in data
    assert data["total"] >= 20
    types = {f["type"] for f in data["fields"]}
    assert "name" in types
    assert "age" in types
    assert "diagnosis" in types


@pytest.mark.asyncio
async def test_supported_fields_has_descriptions(client: AsyncClient) -> None:
    """Each supported field should have a description."""
    resp = await client.get("/api/generate/supported-fields")
    data = resp.json()
    for field in data["fields"]:
        assert "description" in field
        assert "type" in field
        assert isinstance(field["description"], str)


# ── Mimesis Generation ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mimesis_generation(client: AsyncClient, sample_mimesis_schema: dict) -> None:
    """POST /api/generate/mimesis with valid schema returns data."""
    resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["num_rows_generated"] == 50
    assert "download_token" in data
    assert len(data["synthetic_data"]) <= 10  # preview is max 10 rows
    assert "patient_name" in data["columns"]


@pytest.mark.asyncio
async def test_mimesis_invalid_schema(client: AsyncClient) -> None:
    """POST /api/generate/mimesis with invalid field type returns 422."""
    resp = await client.post("/api/generate/mimesis", json={
        "schema": {"col": {"type": "nonexistent_type"}},
        "num_rows": 10,
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mimesis_empty_schema(client: AsyncClient) -> None:
    """POST /api/generate/mimesis with empty schema returns 422."""
    resp = await client.post("/api/generate/mimesis", json={
        "schema": {},
        "num_rows": 10,
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mimesis_invalid_num_rows(client: AsyncClient) -> None:
    """POST /api/generate/mimesis with num_rows=0 returns 422."""
    resp = await client.post("/api/generate/mimesis", json={
        "schema": {"name": {"type": "name"}},
        "num_rows": 0,
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mimesis_too_many_rows(client: AsyncClient) -> None:
    """POST /api/generate/mimesis with num_rows > MAX returns 422."""
    resp = await client.post("/api/generate/mimesis", json={
        "schema": {"name": {"type": "name"}},
        "num_rows": 999999,
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mimesis_category_missing_choices(client: AsyncClient) -> None:
    """Category type without choices returns 422."""
    resp = await client.post("/api/generate/mimesis", json={
        "schema": {"cat": {"type": "category", "options": {}}},
        "num_rows": 5,
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mimesis_missing_body(client: AsyncClient) -> None:
    """POST /api/generate/mimesis with no body returns 422."""
    resp = await client.post("/api/generate/mimesis")
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_mimesis_missing_schema_key(client: AsyncClient) -> None:
    """POST /api/generate/mimesis without 'schema' key returns 422."""
    resp = await client.post("/api/generate/mimesis", json={"num_rows": 10})
    assert resp.status_code == 422


# ── Mimesis Full Integration ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_mimesis_full_flow(client: AsyncClient, sample_mimesis_schema: dict) -> None:
    """Full Mimesis: generate → download → check history."""
    # Step 1: Generate
    gen_resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
    assert gen_resp.status_code == 200
    gen_data = gen_resp.json()
    job_id = gen_data["job_id"]
    token = gen_data["download_token"]
    assert gen_data["status"] == "completed"
    assert gen_data["num_rows_generated"] == 50

    # Step 2: Download CSV
    dl_resp = await client.get(f"/api/generate/download/{token}")
    assert dl_resp.status_code == 200
    assert "text/csv" in dl_resp.headers["content-type"]
    lines = dl_resp.text.strip().split("\n")
    assert len(lines) == 51  # header + 50 data rows

    # Step 3: Verify in history
    hist_resp = await client.get(f"/api/history/{job_id}")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["status"] == "completed"
    assert hist_data["mode"] == "mimesis"
    assert hist_data["num_rows_generated"] == 50


# ── Download ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_download_after_mimesis(client: AsyncClient, sample_mimesis_schema: dict) -> None:
    """Download CSV after Mimesis generation."""
    gen_resp = await client.post("/api/generate/mimesis", json=sample_mimesis_schema)
    assert gen_resp.status_code == 200
    token = gen_resp.json()["download_token"]

    dl_resp = await client.get(f"/api/generate/download/{token}")
    assert dl_resp.status_code == 200
    assert "text/csv" in dl_resp.headers["content-type"]
    assert "attachment" in dl_resp.headers["content-disposition"]
    # Check CSV has content
    lines = dl_resp.text.strip().split("\n")
    assert len(lines) > 1  # header + data


@pytest.mark.asyncio
async def test_download_invalid_token(client: AsyncClient) -> None:
    """Download with nonexistent token returns 404."""
    resp = await client.get("/api/generate/download/nonexistent-token")
    assert resp.status_code == 404


# ── CTGAN Upload Validation ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ctgan_wrong_file_type(client: AsyncClient) -> None:
    """POST /api/generate/ctgan with .txt file returns 422."""
    resp = await client.post(
        "/api/generate/ctgan",
        files={"file": ("data.txt", b"some,data\n1,2", "text/plain")},
        data={"num_rows": "10", "epochs": "2"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_ctgan_file_too_large(client: AsyncClient) -> None:
    """POST /api/generate/ctgan with oversized file returns 413."""
    # Create a file larger than MAX_FILE_SIZE_MB
    big_content = b"a,b,c\n" + b"1,2,3\n" * (1024 * 1024 * 11)  # ~11MB
    resp = await client.post(
        "/api/generate/ctgan",
        files={"file": ("big.csv", big_content, "text/csv")},
        data={"num_rows": "10", "epochs": "2"},
    )
    assert resp.status_code == 413


@pytest.mark.asyncio
async def test_ctgan_invalid_num_rows(client: AsyncClient, sample_csv_bytes: bytes) -> None:
    """POST /api/generate/ctgan with num_rows=0 returns 422."""
    resp = await client.post(
        "/api/generate/ctgan",
        files={"file": ("data.csv", sample_csv_bytes, "text/csv")},
        data={"num_rows": "0", "epochs": "2"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_ctgan_no_filename(client: AsyncClient) -> None:
    """POST /api/generate/ctgan without a proper filename returns 422."""
    resp = await client.post(
        "/api/generate/ctgan",
        files={"file": ("", b"some,data\n1,2", "text/csv")},
        data={"num_rows": "10", "epochs": "2"},
    )
    assert resp.status_code == 422


# ── CTGAN Full Integration (slow) ────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.slow
async def test_ctgan_full_flow(client: AsyncClient, sample_csv_bytes: bytes) -> None:
    """Full CTGAN: upload CSV → generate → download → check history."""
    # Step 1: Generate
    gen_resp = await client.post(
        "/api/generate/ctgan",
        files={"file": ("health.csv", sample_csv_bytes, "text/csv")},
        data={"num_rows": "20", "epochs": "2"},
    )
    assert gen_resp.status_code == 200
    data = gen_resp.json()
    assert data["status"] == "completed"
    assert data["num_rows_generated"] == 20
    assert "quality_metrics" in data
    assert data["quality_metrics"]["overall_score"] >= 0

    # Step 2: Download
    dl_resp = await client.get(f"/api/generate/download/{data['download_token']}")
    assert dl_resp.status_code == 200
    lines = dl_resp.text.strip().split("\n")
    assert len(lines) == 21  # 1 header + 20 data rows

    # Step 3: Verify in history
    hist_resp = await client.get(f"/api/history/{data['job_id']}")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert hist_data["status"] == "completed"
    assert hist_data["mode"] == "ctgan"
    assert hist_data["quality_score"] >= 0
    assert hist_data["quality_metrics"] is not None
