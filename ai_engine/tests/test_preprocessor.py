"""
Tests for the DataPreprocessor.

Covers:
- Type detection (continuous, categorical, datetime, boolean)
- PII column removal
- Missing value handling
- Edge cases (empty DataFrame, single column, all-PII columns)
- SDV metadata generation
- Large datasets
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_engine.preprocessor import (
    DataPreprocessor,
    PreprocessorError,
    _detect_boolean,
    _detect_column_type,
    _detect_datetime,
    _is_pii_column,
)
from ai_engine.schemas import ColumnType


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def healthcare_df() -> pd.DataFrame:
    """Diabetes-style healthcare DataFrame."""
    np.random.seed(42)
    n = 200
    return pd.DataFrame(
        {
            "patient_id": range(1, n + 1),
            "patient_name": [f"Patient_{i}" for i in range(n)],
            "email": [f"patient{i}@example.com" for i in range(n)],
            "age": np.random.randint(18, 90, size=n),
            "glucose": np.random.normal(120, 30, size=n).round(1),
            "bmi": np.random.normal(28, 5, size=n).round(2),
            "blood_pressure": np.random.normal(80, 10, size=n).round(0),
            "outcome": np.random.choice([0, 1], size=n),
            "gender": np.random.choice(["Male", "Female"], size=n),
            "diagnosis_date": pd.date_range("2020-01-01", periods=n, freq="D"),
        }
    )


@pytest.fixture
def preprocessor() -> DataPreprocessor:
    """Fresh preprocessor instance."""
    return DataPreprocessor(remove_pii=True)


# ---------------------------------------------------------------------------
# PII detection tests
# ---------------------------------------------------------------------------


class TestPIIDetection:
    """Tests for PII column detection."""

    def test_exact_pii_names(self) -> None:
        assert _is_pii_column("id") is True
        assert _is_pii_column("name") is True
        assert _is_pii_column("ssn") is True
        assert _is_pii_column("email") is True
        assert _is_pii_column("phone") is True

    def test_pii_patterns(self) -> None:
        assert _is_pii_column("first_name") is True
        assert _is_pii_column("last_name") is True
        assert _is_pii_column("email_address") is True
        assert _is_pii_column("phone_number") is True
        assert _is_pii_column("social_security_number") is True
        assert _is_pii_column("credit_card") is True

    def test_non_pii_columns(self) -> None:
        assert _is_pii_column("age") is False
        assert _is_pii_column("glucose") is False
        assert _is_pii_column("bmi") is False
        assert _is_pii_column("outcome") is False
        assert _is_pii_column("diagnosis_date") is False

    def test_case_insensitive(self) -> None:
        assert _is_pii_column("Email") is True
        assert _is_pii_column("PHONE") is True
        assert _is_pii_column("First_Name") is True

    def test_spaces_and_dashes(self) -> None:
        assert _is_pii_column("first name") is True
        assert _is_pii_column("last-name") is True


# ---------------------------------------------------------------------------
# Type detection tests
# ---------------------------------------------------------------------------


class TestTypeDetection:
    """Tests for column type detection."""

    def test_continuous_detection(self) -> None:
        series = pd.Series(np.random.normal(0, 1, 1000))
        assert _detect_column_type(series) == ColumnType.CONTINUOUS

    def test_categorical_detection(self) -> None:
        series = pd.Series(np.random.choice(["A", "B", "C", "D"], 1000))
        assert _detect_column_type(series) == ColumnType.CATEGORICAL

    def test_boolean_detection(self) -> None:
        series = pd.Series([True, False, True, False, True])
        assert _detect_boolean(series) is True
        assert _detect_column_type(series) == ColumnType.BOOLEAN

    def test_boolean_string_detection(self) -> None:
        series = pd.Series(["yes", "no", "yes", "no"])
        assert _detect_boolean(series) is True

    def test_datetime_detection(self) -> None:
        series = pd.Series(pd.date_range("2020-01-01", periods=100, freq="D"))
        assert _detect_datetime(series) is True

    def test_datetime_string_detection(self) -> None:
        dates = ["2020-01-01", "2020-02-15", "2020-03-20", "2020-04-10"]
        series = pd.Series(dates * 25)
        assert _detect_datetime(series) is True

    def test_integer_categorical(self) -> None:
        """Low-cardinality integers should be detected as categorical."""
        series = pd.Series(np.random.choice([0, 1], size=1000))
        result = _detect_column_type(series)
        # 0/1 is boolean
        assert result in (ColumnType.BOOLEAN, ColumnType.CATEGORICAL)

    def test_high_cardinality_numeric(self) -> None:
        """High-cardinality integers → continuous."""
        series = pd.Series(range(1000))
        assert _detect_column_type(series) == ColumnType.CONTINUOUS

    def test_high_cardinality_name_is_categorical(self) -> None:
        series = pd.Series([f"Person {i}" for i in range(100)])
        assert _detect_column_type(series, "user_name") == ColumnType.CATEGORICAL

    def test_id_named_column_is_id(self) -> None:
        series = pd.Series(range(100))
        assert _detect_column_type(series, "user_id") == ColumnType.ID


# ---------------------------------------------------------------------------
# Preprocessor integration tests
# ---------------------------------------------------------------------------


class TestPreprocessorIntegration:
    """End-to-end tests for the preprocessor."""

    def test_basic_healthcare(
        self, preprocessor: DataPreprocessor, healthcare_df: pd.DataFrame
    ) -> None:
        clean_df, result = preprocessor.fit_transform(healthcare_df)

        # PII columns should be removed
        assert "patient_id" not in clean_df.columns
        assert "email" not in clean_df.columns
        assert "patient_name" not in clean_df.columns

        # Non-PII columns should remain
        assert "age" in clean_df.columns
        assert "glucose" in clean_df.columns
        assert "bmi" in clean_df.columns

        # Result metadata
        assert result.original_row_count == 200
        assert result.row_count == 200
        assert len(result.columns) > 0

    def test_pii_removal(self, preprocessor: DataPreprocessor) -> None:
        df = pd.DataFrame(
            {
                "id": [1, 2, 3],
                "name": ["Alice", "Bob", "Charlie"],
                "email": ["a@b.c", "b@c.d", "c@d.e"],
                "age": [25, 30, 35],
                "score": [0.9, 0.8, 0.7],
            }
        )
        clean_df, result = preprocessor.fit_transform(df)

        assert "id" not in clean_df.columns
        assert "name" not in clean_df.columns
        assert "email" not in clean_df.columns
        assert "age" in clean_df.columns
        assert "score" in clean_df.columns
        assert set(result.removed_columns) == {"id", "name", "email"}

    def test_missing_value_imputation(self, preprocessor: DataPreprocessor) -> None:
        df = pd.DataFrame(
            {
                "age": [25, np.nan, 35, np.nan, 45],
                "gender": ["M", None, "F", "M", None],
                "score": [0.9, 0.8, np.nan, 0.7, 0.6],
            }
        )
        clean_df, _ = preprocessor.fit_transform(df)

        # No nulls should remain
        assert clean_df.isna().sum().sum() == 0

    def test_no_pii_removal(self) -> None:
        """When PII removal is disabled, all columns stay."""
        proc = DataPreprocessor(remove_pii=False)
        df = pd.DataFrame(
            {
                "id": [1, 2, 3],
                "name": ["A", "B", "C"],
                "value": [10, 20, 30],
            }
        )
        clean_df, result = proc.fit_transform(df)
        assert "id" in clean_df.columns
        assert "name" in clean_df.columns
        assert result.removed_columns == []


# ---------------------------------------------------------------------------
# Edge case tests
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Edge case testing."""

    def test_empty_dataframe(self, preprocessor: DataPreprocessor) -> None:
        with pytest.raises(PreprocessorError, match="empty"):
            preprocessor.fit_transform(pd.DataFrame())

    def test_none_input(self, preprocessor: DataPreprocessor) -> None:
        with pytest.raises(PreprocessorError, match="pandas DataFrame"):
            preprocessor.fit_transform(None)  # type: ignore[arg-type]

    def test_single_column(self, preprocessor: DataPreprocessor) -> None:
        df = pd.DataFrame({"score": [1.0, 2.0, 3.0, 4.0, 5.0]})
        clean_df, result = preprocessor.fit_transform(df)
        assert len(clean_df.columns) == 1
        assert result.columns[0].name == "score"

    def test_all_pii_columns(self, preprocessor: DataPreprocessor) -> None:
        df = pd.DataFrame(
            {
                "id": [1, 2],
                "name": ["A", "B"],
                "email": ["a@b.c", "b@c.d"],
            }
        )
        with pytest.raises(PreprocessorError, match="All columns were removed"):
            preprocessor.fit_transform(df)

    def test_large_dataset(self, preprocessor: DataPreprocessor) -> None:
        np.random.seed(42)
        df = pd.DataFrame(
            {
                "value_a": np.random.normal(0, 1, 10_000),
                "value_b": np.random.normal(5, 2, 10_000),
                "category": np.random.choice(["X", "Y", "Z"], 10_000),
            }
        )
        clean_df, result = preprocessor.fit_transform(df)
        assert result.row_count == 10_000
        assert len(result.columns) == 3


# ---------------------------------------------------------------------------
# SDV metadata tests
# ---------------------------------------------------------------------------


class TestSDVMetadata:
    """Tests for SDV metadata conversion."""

    def test_metadata_dict_structure(self, preprocessor: DataPreprocessor) -> None:
        df = pd.DataFrame(
            {
                "age": [25, 30, 35, 40, 45],
                "score": [0.9, 0.8, 0.7, 0.6, 0.5],
                "category": ["A", "B", "A", "B", "A"],
            }
        )
        _, result = preprocessor.fit_transform(df)
        meta = preprocessor.get_sdv_metadata_dict(result)

        assert "columns" in meta
        assert "age" in meta["columns"]
        assert "score" in meta["columns"]
        assert "category" in meta["columns"]

    def test_metadata_sdtypes(self, preprocessor: DataPreprocessor) -> None:
        df = pd.DataFrame(
            {
                "value": np.random.normal(0, 1, 200),
                "flag": [True, False] * 100,
                "label": np.random.choice(["A", "B"], 200),
            }
        )
        _, result = preprocessor.fit_transform(df)
        meta = preprocessor.get_sdv_metadata_dict(result)

        assert meta["columns"]["value"]["sdtype"] == "numerical"
        assert meta["columns"]["label"]["sdtype"] == "categorical"
        # flag could be boolean or categorical depending on detection
        assert meta["columns"]["flag"]["sdtype"] in ("boolean", "categorical")
