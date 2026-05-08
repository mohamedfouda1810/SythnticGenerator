"""
Mimesis generation service.

Orchestrates: schema validation → Mimesis generation → result storage.
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


def run_mimesis_pipeline(
    schema: Dict[str, Any],
    num_rows: int,
    locale: str = "en",
) -> Dict[str, Any]:
    """
    Execute the Mimesis generation pipeline.

    Returns dict with keys: synthetic_df, preview, download_token, num_rows_generated, columns.
    """
    generator = MimesisGenerator(locale=locale)
    synthetic_df = generator.generate(schema=schema, num_rows=num_rows)

    token = store_result(synthetic_df)

    return {
        "synthetic_df": synthetic_df,
        "preview": synthetic_df.head(10).to_dict(orient="records"),
        "download_token": token,
        "num_rows_generated": len(synthetic_df),
        "columns": list(synthetic_df.columns),
    }
