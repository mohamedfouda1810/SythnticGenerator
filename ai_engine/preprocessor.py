"""
Data Preprocessor for the AI Synthetic Data Generation Engine.

Responsibilities:
- Auto-detect column types (continuous, categorical, datetime, boolean)
- Handle missing values intelligently (median for numeric, mode for categorical)
- Remove PII columns automatically based on name patterns
- Normalize / encode data for downstream CTGAN consumption
- Return a clean DataFrame alongside structured metadata
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from ai_engine.schemas import ColumnMetadata, ColumnType, PreprocessorResult


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Patterns that suggest a column contains PII (case-insensitive substrings)
PII_PATTERNS: List[str] = [
    "ssn",
    "social_security",
    "email",
    "e_mail",
    "phone",
    "telephone",
    "mobile",
    "first_name",
    "last_name",
    "full_name",
    "surname",
    "passport",
    "national_id",
    "driver_license",
    "credit_card",
    "card_number",
    "patient_id",
    "patient_name",
    "person_name",
    "user_name",
    "username",
]

# Exact-match column names that are PII (case-insensitive)
PII_EXACT_NAMES: List[str] = [
    "id",
    "name",
    "ssn",
    "email",
    "phone",
]

# Maximum unique-value ratio for a column to be considered categorical
CATEGORICAL_UNIQUE_RATIO: float = 0.05  # 5 %
CATEGORICAL_MAX_UNIQUE: int = 50

# Minimum fraction of successful datetime parses to classify as datetime
DATETIME_PARSE_THRESHOLD: float = 0.8

# Number of sample values to store in metadata
SAMPLE_VALUES_COUNT: int = 5


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class PreprocessorError(Exception):
    """Raised when preprocessing encounters an unrecoverable problem."""


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _is_pii_column(column_name: str) -> bool:
    """Return True if the column name looks like PII."""
    normalized = column_name.strip().lower().replace(" ", "_").replace("-", "_")

    # Exact match
    if normalized in PII_EXACT_NAMES:
        return True

    # Substring / pattern match
    for pattern in PII_PATTERNS:
        if pattern in normalized:
            return True

    return False


def _detect_boolean(series: pd.Series) -> bool:
    """Return True if the series contains only boolean-like values."""
    unique_vals = set(series.dropna().unique())
    bool_sets = [
        {True, False},
        {0, 1},
        {0.0, 1.0},
        {"true", "false"},
        {"yes", "no"},
        {"y", "n"},
        {"0", "1"},
        {True},
        {False},
        {0},
        {1},
    ]
    # Normalise strings to lowercase for comparison
    normalised = set()
    for v in unique_vals:
        if isinstance(v, str):
            normalised.add(v.strip().lower())
        else:
            normalised.add(v)

    return normalised in bool_sets


def _detect_datetime(series: pd.Series) -> bool:
    """Return True if the majority of non-null values parse as datetime."""
    if series.dropna().empty:
        return False

    if pd.api.types.is_datetime64_any_dtype(series):
        return True

    # Only attempt parsing on object / string columns
    if not (series.dtype == object or pd.api.types.is_string_dtype(series)):
        return False

    sample = series.dropna().head(200)
    parsed = pd.to_datetime(sample, errors="coerce", format="mixed")
    success_ratio = parsed.notna().sum() / len(sample)
    return bool(success_ratio >= DATETIME_PARSE_THRESHOLD)


def _detect_column_type(series: pd.Series) -> ColumnType:
    """Heuristically detect the semantic type of a pandas Series."""
    # 1. Boolean check (before numeric, since bool is numeric in pandas)
    if _detect_boolean(series):
        return ColumnType.BOOLEAN

    # 2. Datetime check
    if _detect_datetime(series):
        return ColumnType.DATETIME

    # 3. Numeric check → continuous vs categorical
    if pd.api.types.is_numeric_dtype(series):
        nunique = series.nunique()
        n = len(series)
        if n > 0 and (nunique / n <= CATEGORICAL_UNIQUE_RATIO and nunique <= CATEGORICAL_MAX_UNIQUE):
            return ColumnType.CATEGORICAL
        return ColumnType.CONTINUOUS

    # 4. String / object → categorical
    return ColumnType.CATEGORICAL


def _compute_stats(series: pd.Series, col_type: ColumnType) -> Dict[str, Any]:
    """Compute descriptive statistics based on column type."""
    stats: Dict[str, Any] = {}

    if col_type == ColumnType.CONTINUOUS:
        stats["min"] = float(series.min()) if not series.empty else None
        stats["max"] = float(series.max()) if not series.empty else None
        stats["mean"] = float(series.mean()) if not series.empty else None
        stats["std"] = float(series.std()) if not series.empty else None
        stats["median"] = float(series.median()) if not series.empty else None

    elif col_type == ColumnType.CATEGORICAL:
        value_counts = series.value_counts()
        stats["top_values"] = value_counts.head(10).to_dict()
        stats["unique_count"] = int(series.nunique())

    elif col_type == ColumnType.DATETIME:
        parsed = pd.to_datetime(series, errors="coerce")
        stats["min"] = str(parsed.min()) if parsed.notna().any() else None
        stats["max"] = str(parsed.max()) if parsed.notna().any() else None

    elif col_type == ColumnType.BOOLEAN:
        value_counts = series.value_counts()
        stats["distribution"] = value_counts.to_dict()

    return stats


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class DataPreprocessor:
    """
    Preprocesses raw DataFrames for synthetic data generation.

    Workflow:
        1. Remove PII columns
        2. Auto-detect column types
        3. Handle missing values
        4. Build metadata dict
        5. Return (clean_df, metadata)
    """

    def __init__(self, remove_pii: bool = True) -> None:
        """
        Initialise the preprocessor.

        Args:
            remove_pii: Whether to auto-detect and remove PII columns.
        """
        self.remove_pii = remove_pii

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fit_transform(
        self,
        df: pd.DataFrame,
    ) -> Tuple[pd.DataFrame, PreprocessorResult]:
        """
        Clean and transform the input DataFrame.

        Args:
            df: Raw input DataFrame.

        Returns:
            Tuple of (cleaned DataFrame, PreprocessorResult metadata).

        Raises:
            PreprocessorError: If the input is empty or invalid.
        """
        if df is None or not isinstance(df, pd.DataFrame):
            raise PreprocessorError("Input must be a pandas DataFrame.")

        if df.empty:
            raise PreprocessorError("Input DataFrame is empty.")

        original_row_count = len(df)
        clean_df = df.copy()

        # Step 1: Remove PII columns
        removed_columns: List[str] = []
        if self.remove_pii:
            clean_df, removed_columns = self._remove_pii_columns(clean_df)

        if clean_df.columns.empty:
            raise PreprocessorError(
                "All columns were removed (likely all detected as PII). "
                "Disable PII removal or rename columns."
            )

        # Step 2: Detect types
        column_types: Dict[str, ColumnType] = {}
        for col in clean_df.columns:
            column_types[col] = _detect_column_type(clean_df[col])

        # Step 3: Handle missing values
        clean_df = self._handle_missing_values(clean_df, column_types)

        # Step 3b: Convert detected boolean columns to actual bool dtype
        clean_df = self._convert_boolean_columns(clean_df, column_types)

        # Step 4: Build metadata
        columns_meta: List[ColumnMetadata] = []
        for col in clean_df.columns:
            series = clean_df[col]
            col_type = column_types[col]
            sample_vals = (
                series.dropna()
                .head(SAMPLE_VALUES_COUNT)
                .tolist()
            )
            stats = _compute_stats(series, col_type)
            columns_meta.append(
                ColumnMetadata(
                    name=col,
                    dtype=col_type,
                    nullable=bool(series.isna().any()),
                    unique_count=int(series.nunique()),
                    sample_values=sample_vals,
                    stats=stats,
                )
            )

        result = PreprocessorResult(
            columns=columns_meta,
            removed_columns=removed_columns,
            row_count=len(clean_df),
            original_row_count=original_row_count,
        )

        return clean_df, result

    def get_sdv_metadata_dict(
        self,
        preprocessor_result: PreprocessorResult,
    ) -> Dict[str, Any]:
        """
        Convert PreprocessorResult into an SDV-compatible metadata dict.

        Args:
            preprocessor_result: Output of ``fit_transform``.

        Returns:
            Dict suitable for ``sdv.metadata.SingleTableMetadata.load_from_dict``.
        """
        columns: Dict[str, Dict[str, str]] = {}
        for col_meta in preprocessor_result.columns:
            if col_meta.dtype == ColumnType.CONTINUOUS:
                columns[col_meta.name] = {"sdtype": "numerical"}
            elif col_meta.dtype == ColumnType.CATEGORICAL:
                columns[col_meta.name] = {"sdtype": "categorical"}
            elif col_meta.dtype == ColumnType.DATETIME:
                columns[col_meta.name] = {"sdtype": "datetime"}
            elif col_meta.dtype == ColumnType.BOOLEAN:
                columns[col_meta.name] = {"sdtype": "boolean"}

        return {
            "columns": columns,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _remove_pii_columns(
        self, df: pd.DataFrame
    ) -> Tuple[pd.DataFrame, List[str]]:
        """Identify and drop PII columns."""
        removed: List[str] = []
        for col in df.columns:
            if _is_pii_column(col):
                removed.append(col)
        return df.drop(columns=removed), removed

    def _handle_missing_values(
        self,
        df: pd.DataFrame,
        column_types: Dict[str, ColumnType],
    ) -> pd.DataFrame:
        """
        Fill missing values using type-aware strategies.

        - Continuous → median
        - Categorical → mode (most frequent)
        - Datetime → forward-fill then backward-fill
        - Boolean → mode
        """
        df = df.copy()
        for col, col_type in column_types.items():
            if df[col].isna().sum() == 0:
                continue

            if col_type == ColumnType.CONTINUOUS:
                median = df[col].median()
                df[col] = df[col].fillna(median)

            elif col_type in (ColumnType.CATEGORICAL, ColumnType.BOOLEAN):
                mode_vals = df[col].mode()
                fill_value = mode_vals.iloc[0] if not mode_vals.empty else "UNKNOWN"
                df[col] = df[col].fillna(fill_value)

            elif col_type == ColumnType.DATETIME:
                df[col] = df[col].ffill().bfill()

        return df

    @staticmethod
    def _convert_boolean_columns(
        df: pd.DataFrame,
        column_types: Dict[str, ColumnType],
    ) -> pd.DataFrame:
        """
        Convert columns detected as boolean to actual ``bool`` dtype.

        Handles int (0/1), float (0.0/1.0), and string ('yes'/'no', etc.)
        representations.
        """
        df = df.copy()
        truthy = {True, 1, 1.0, "true", "yes", "y", "1"}
        for col, col_type in column_types.items():
            if col_type != ColumnType.BOOLEAN:
                continue
            df[col] = df[col].apply(
                lambda v: (
                    v.strip().lower() if isinstance(v, str) else v
                ) in truthy
                if pd.notna(v)
                else False
            )
            df[col] = df[col].astype(bool)
        return df
