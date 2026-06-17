"""
Pydantic data models for the AI Synthetic Data Generation Engine.

Defines request/response schemas for CTGAN generation, Mimesis generation,
data evaluation, and generation results. All models use strict validation
with type hints and sensible defaults.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MIN_ROWS: int = 1
MAX_ROWS: int = 1_000_000
DEFAULT_ROWS: int = 1_000
DEFAULT_EPOCHS: int = 100
MIN_EPOCHS: int = 1
MAX_EPOCHS: int = 1_000
QUALITY_SCORE_MIN: float = 0.0
QUALITY_SCORE_MAX: float = 100.0


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class ColumnType(str, Enum):
    """Detected column data types."""

    CONTINUOUS = "continuous"
    CATEGORICAL = "categorical"
    DATETIME = "datetime"
    BOOLEAN = "boolean"
    ID = "id"


class MimesisFieldType(str, Enum):
    """Supported Mimesis field types for rule-based generation."""

    # Personal
    NAME = "name"
    FIRST_NAME = "first_name"
    LAST_NAME = "last_name"
    EMAIL = "email"
    PHONE = "phone"
    ADDRESS = "address"
    COUNTRY = "country"
    CITY = "city"
    AGE = "age"
    GENDER = "gender"

    # Temporal
    DATE = "date"
    DATETIME = "datetime"

    # Numeric
    INTEGER = "integer"
    FLOAT = "float"

    # Categorical / other
    CATEGORY = "category"
    BOOLEAN = "boolean"
    UUID = "uuid"
    ID = "id"

    # Medical
    DIAGNOSIS = "diagnosis"
    BLOOD_TYPE = "blood_type"
    MEDICATION = "medication"
    SYMPTOM = "symptom"

    # Financial
    SALARY = "salary"
    CURRENCY = "currency"
    IBAN = "iban"


class GenerationMode(str, Enum):
    """Available generation modes."""

    CTGAN = "ctgan"
    MIMESIS = "mimesis"


# ---------------------------------------------------------------------------
# Column / field specifications
# ---------------------------------------------------------------------------


class ColumnMetadata(BaseModel):
    """Metadata for a single column after preprocessing."""

    name: str = Field(..., description="Column name")
    dtype: ColumnType = Field(..., description="Detected column type")
    nullable: bool = Field(default=False, description="Whether NULLs are present")
    unique_count: int = Field(default=0, description="Number of unique values")
    sample_values: List[Any] = Field(
        default_factory=list,
        description="Up to 5 sample values",
    )
    stats: Dict[str, Any] = Field(
        default_factory=dict,
        description="Descriptive statistics (min, max, mean, etc.)",
    )


class PreprocessorResult(BaseModel):
    """Output of the data preprocessor."""

    columns: List[ColumnMetadata] = Field(
        default_factory=list,
        description="Per-column metadata",
    )
    removed_columns: List[str] = Field(
        default_factory=list,
        description="Columns removed (e.g. PII)",
    )
    row_count: int = Field(default=0, description="Rows after cleaning")
    original_row_count: int = Field(default=0, description="Rows before cleaning")


class MimesisFieldSpec(BaseModel):
    """Specification for a single Mimesis field."""

    type: MimesisFieldType = Field(..., description="Mimesis field type")
    options: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extra options (min, max, choices, decimals, …)",
    )


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class CTGANRequest(BaseModel):
    """Request payload for CTGAN-based generation."""

    num_rows: int = Field(
        default=DEFAULT_ROWS,
        ge=MIN_ROWS,
        le=MAX_ROWS,
        description="Number of synthetic rows to generate",
    )
    epochs: int = Field(
        default=DEFAULT_EPOCHS,
        ge=MIN_EPOCHS,
        le=MAX_EPOCHS,
        description="Training epochs for CTGAN",
    )
    batch_size: int = Field(
        default=500,
        ge=1,
        le=10_000,
        description="Training batch size",
    )
    generator_dim: List[int] = Field(
        default=[256, 256],
        description="Generator layer dimensions",
    )
    discriminator_dim: List[int] = Field(
        default=[256, 256],
        description="Discriminator layer dimensions",
    )
    remove_pii: bool = Field(
        default=True,
        description="Whether to auto-remove PII columns before training",
    )

    @field_validator("generator_dim", "discriminator_dim")
    @classmethod
    def _validate_dims(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("Dimension list must not be empty")
        if any(d <= 0 for d in v):
            raise ValueError("All dimensions must be positive integers")
        return v


class MimesisRequest(BaseModel):
    """Request payload for Mimesis rule-based generation."""

    model_config = {"protected_namespaces": ()}

    schema_definition: Dict[str, MimesisFieldSpec] = Field(
        ...,
        alias="schema",
        description='Column specs: {"col": {"type": "field_type", "options": {}}}',
    )
    num_rows: int = Field(
        default=DEFAULT_ROWS,
        ge=MIN_ROWS,
        le=MAX_ROWS,
        description="Number of rows to generate",
    )
    locale: str = Field(
        default="en",
        description="Locale for Mimesis providers",
    )


# ---------------------------------------------------------------------------
# Metric / evaluation models
# ---------------------------------------------------------------------------


class ColumnMetric(BaseModel):
    """Quality metrics for a single column."""

    column_name: str
    metric_name: str = Field(
        ...,
        description="E.g. 'ks_statistic', 'tvd'",
    )
    score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Metric value (0 = identical, 1 = max divergence)",
    )
    similarity: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Similarity percentage (100 = perfect match)",
    )


class EvaluationResult(BaseModel):
    """Full evaluation comparing real vs synthetic data."""

    column_metrics: List[ColumnMetric] = Field(default_factory=list)
    correlation_difference: float = Field(
        default=0.0,
        ge=0.0,
        description="Frobenius norm of correlation matrix difference",
    )
    missing_value_rates: Dict[str, float] = Field(
        default_factory=dict,
        description="Missing-value rate per column in synthetic data",
    )
    overall_quality_score: float = Field(
        default=0.0,
        ge=QUALITY_SCORE_MIN,
        le=QUALITY_SCORE_MAX,
        description="Aggregate quality score 0-100",
    )
    summary: str = Field(
        default="",
        description="Human-readable quality summary",
    )


# ---------------------------------------------------------------------------
# Generation result (shared by both modes)
# ---------------------------------------------------------------------------


class GenerationResult(BaseModel):
    """Wrapper returned after any generation run."""

    mode: GenerationMode = Field(..., description="Generation mode used")
    num_rows: int = Field(..., description="Number of rows generated")
    columns: List[str] = Field(default_factory=list, description="Column names")
    preview_rows: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="First N rows as list of dicts (preview)",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of generation",
    )
    evaluation: Optional[EvaluationResult] = Field(
        default=None,
        description="Optional quality evaluation",
    )
