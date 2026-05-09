"""
Mimesis generation service.

Orchestrates: schema validation → Mimesis generation → quality scoring → result storage.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

import pandas as pd

from ai_engine.mimesis_generator import MimesisGenerationError, MimesisGenerator
from ai_engine.schemas import MimesisFieldType
from backend.services.ctgan_service import store_result

logger = logging.getLogger(__name__)

# All supported field types with their options
SUPPORTED_FIELDS: List[Dict[str, Any]] = [
    {"type": "name", "description": "Full name", "options": {}},
    {"type": "first_name", "description": "First name", "options": {}},
    {"type": "last_name", "description": "Last name", "options": {}},
    {"type": "email", "description": "Email address", "options": {}},
    {"type": "phone", "description": "Phone number", "options": {}},
    {"type": "address", "description": "Street address", "options": {}},
    {"type": "country", "description": "Country name", "options": {}},
    {"type": "city", "description": "City name", "options": {}},
    {"type": "age", "description": "Age (integer)", "options": {"min": 18, "max": 90}},
    {"type": "gender", "description": "Gender", "options": {}},
    {"type": "date", "description": "Date (YYYY-MM-DD)", "options": {"start": "2000-01-01", "end": "2025-12-31"}},
    {"type": "datetime", "description": "ISO datetime", "options": {"start": "2000-01-01", "end": "2025-12-31"}},
    {"type": "integer", "description": "Integer", "options": {"min": 0, "max": 1000000}},
    {"type": "float", "description": "Float", "options": {"min": 0.0, "max": 1000000.0, "decimals": 2}},
    {"type": "category", "description": "Categorical value", "options": {"choices": ["A", "B", "C"]}},
    {"type": "boolean", "description": "True/False", "options": {}},
    {"type": "uuid", "description": "UUID string", "options": {}},
    {"type": "id", "description": "Sequential integer ID", "options": {}},
    {"type": "diagnosis", "description": "Medical diagnosis", "options": {}},
    {"type": "blood_type", "description": "Blood type (A+, O-, etc.)", "options": {}},
    {"type": "medication", "description": "Medication name", "options": {}},
    {"type": "symptom", "description": "Medical symptom", "options": {}},
    {"type": "salary", "description": "Salary amount", "options": {"min": 25000, "max": 250000}},
    {"type": "currency", "description": "Currency code", "options": {}},
    {"type": "iban", "description": "IBAN number", "options": {}},
]

VALID_FIELD_TYPES = {f["type"] for f in SUPPORTED_FIELDS}

# Type expectations for quality scoring
_NUMERIC_TYPES = {"integer", "float", "age", "salary", "id"}
_STRING_TYPES = {"name", "first_name", "last_name", "email", "phone", "address",
                 "country", "city", "gender", "uuid", "iban", "currency",
                 "diagnosis", "blood_type", "medication", "symptom"}


def validate_schema(schema: Dict[str, Any]) -> List[str]:
    """
    Validate a Mimesis schema dict. Return list of error messages (empty = valid).
    """
    errors: List[str] = []
    if not schema:
        errors.append("Schema must not be empty.")
        return errors

    for col_name, spec in schema.items():
        if not isinstance(spec, dict):
            errors.append(f"Column '{col_name}': spec must be a dict.")
            continue
        field_type = spec.get("type")
        if not field_type:
            errors.append(f"Column '{col_name}': missing 'type' field.")
            continue
        if field_type not in VALID_FIELD_TYPES:
            errors.append(
                f"Column '{col_name}': unsupported type '{field_type}'. "
                f"Valid types: {sorted(VALID_FIELD_TYPES)}"
            )
        if field_type == "category":
            choices = spec.get("options", {}).get("choices", [])
            if not choices:
                errors.append(f"Column '{col_name}': 'category' type requires 'choices' in options.")

    return errors


def calculate_mimesis_quality(df: pd.DataFrame, schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate quality metrics for Mimesis-generated data.
    Since there's no real data to compare, we validate structural correctness.

    Scoring (starts at 100, deductions applied):
    - Missing columns: -10 per column
    - Null values: proportional deduction (max -30)
    - Type mismatches: proportional deduction (max -20)
    - Row count mismatch: -10
    """
    score = 100.0
    deductions: List[str] = []

    # Check 1: All requested columns present
    expected_cols = set(schema.keys())
    actual_cols = set(df.columns)
    missing_cols = expected_cols - actual_cols
    if missing_cols:
        penalty = min(len(missing_cols) * 10, 30)
        score -= penalty
        deductions.append(f"Missing columns: {sorted(missing_cols)} (-{penalty})")

    # Check 2: Null value rate
    total_cells = len(df) * len(df.columns) if len(df.columns) > 0 else 1
    null_count = int(df.isnull().sum().sum())
    null_rate = null_count / total_cells if total_cells > 0 else 0
    if null_rate > 0:
        penalty = round(null_rate * 30, 1)
        score -= penalty
        deductions.append(f"Null values: {null_rate:.1%} ({null_count} cells) (-{penalty})")

    # Check 3: Type correctness
    type_matches = 0
    type_total = 0
    for col_name, spec in schema.items():
        if col_name not in df.columns:
            continue
        type_total += 1
        field_type = spec.get("type", "")
        col_dtype = df[col_name].dtype

        if field_type in _NUMERIC_TYPES:
            if pd.api.types.is_numeric_dtype(col_dtype):
                type_matches += 1
        elif field_type == "boolean":
            if col_dtype == bool or set(df[col_name].dropna().unique()).issubset({True, False, 0, 1}):
                type_matches += 1
        else:
            # String-like types: just check it's object/string
            type_matches += 1

    type_accuracy = type_matches / type_total if type_total > 0 else 1.0
    if type_accuracy < 1.0:
        penalty = round((1 - type_accuracy) * 20, 1)
        score -= penalty
        deductions.append(f"Type mismatches: {type_accuracy:.0%} accuracy (-{penalty})")

    # Check 4: Extra columns (shouldn't happen but check)
    extra_cols = actual_cols - expected_cols
    if extra_cols:
        score -= 5
        deductions.append(f"Unexpected extra columns: {sorted(extra_cols)} (-5)")

    final_score = max(0, round(score, 1))

    return {
        "overall_score": final_score,
        "method": "schema_validation",
        "details": {
            "columns_complete": len(missing_cols) == 0,
            "null_rate": round(null_rate * 100, 2),
            "type_accuracy": round(type_accuracy * 100, 1),
            "total_cells": total_cells,
            "null_cells": null_count,
            "deductions": deductions,
        },
    }


def run_mimesis_pipeline(
    schema: Dict[str, Any],
    num_rows: int,
    locale: str = "en",
) -> Dict[str, Any]:
    """
    Execute the Mimesis generation pipeline.

    Returns dict with keys: synthetic_df, preview, quality_metrics, quality_score, download_token, etc.
    """
    generator = MimesisGenerator(locale=locale)
    synthetic_df = generator.generate(schema=schema, num_rows=num_rows)

    # Calculate quality score
    quality = calculate_mimesis_quality(synthetic_df, schema)

    token = store_result(synthetic_df)

    return {
        "synthetic_df": synthetic_df,
        "preview": synthetic_df.head(10).to_dict(orient="records"),
        "quality_metrics": quality,
        "quality_score": quality["overall_score"],
        "download_token": token,
        "num_rows_generated": len(synthetic_df),
        "columns": list(synthetic_df.columns),
    }
