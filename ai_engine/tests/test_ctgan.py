"""
Tests for the CTGANGenerator.
"""

from __future__ import annotations

from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from ai_engine.ctgan_generator import (
    CTGANGenerationError,
    CTGANGenerator,
    _resolve_ctgan_batch_size,
)
from ai_engine.schemas import CTGANRequest


@pytest.fixture
def healthcare_df() -> pd.DataFrame:
    np.random.seed(42)
    n = 100
    return pd.DataFrame(
        {
            "age": np.random.randint(18, 90, size=n),
            "glucose": np.random.normal(120, 30, size=n).round(1),
            "bmi": np.random.normal(28, 5, size=n).round(2),
            "blood_pressure": np.random.normal(80, 10, size=n).round(0),
            "outcome": np.random.choice([0, 1], size=n),
        }
    )


@pytest.fixture
def generator() -> CTGANGenerator:
    return CTGANGenerator()


class TestCTGANGeneration:
    @pytest.mark.slow
    def test_basic_generation(self, generator, healthcare_df):
        synthetic = generator.generate(
            healthcare_df, num_rows=50, epochs=5, batch_size=50
        )
        assert isinstance(synthetic, pd.DataFrame)
        assert len(synthetic) == 50

    @pytest.mark.slow
    def test_custom_epochs(self, generator, healthcare_df):
        synthetic = generator.generate(
            healthcare_df, num_rows=20, epochs=2, batch_size=50
        )
        assert len(synthetic) == 20

    @pytest.mark.slow
    def test_generate_from_request(self, generator, healthcare_df):
        request = CTGANRequest(num_rows=30, epochs=2, batch_size=50)
        result = generator.generate_from_request(healthcare_df, request)
        assert result.num_rows == 30
        assert result.mode.value == "ctgan"

    @pytest.mark.slow
    def test_small_no_privacy_generation(self, generator):
        df = pd.DataFrame(
            {
                "id": [1, 2, 3],
                "name": ["Alice", "Bob", "Charlie"],
                "email": ["a@example.com", "b@example.com", "c@example.com"],
                "value": [10, 20, 30],
            }
        )

        synthetic = generator.generate(
            df,
            num_rows=5,
            epochs=1,
            batch_size=3,
            remove_pii=False,
        )

        assert list(synthetic.columns) == list(df.columns)
        assert len(synthetic) == 5

    @pytest.mark.slow
    def test_no_privacy_repeated_user_names_are_not_primary_keys(self, generator):
        df = pd.DataFrame(
            {
                "user_id": range(1, 31),
                "user_name": ["Forrest Graves", "Foster Ortega", "Hung Franco"] * 10,
                "age": [20 + (i % 12) for i in range(30)],
                "segment": ["A", "B"] * 15,
            }
        )

        synthetic = generator.generate(
            df,
            num_rows=10,
            epochs=1,
            batch_size=30,
            remove_pii=False,
        )

        assert list(synthetic.columns) == list(df.columns)
        assert len(synthetic) == 10


class TestCTGANErrors:
    def test_empty_dataframe(self, generator):
        with pytest.raises(CTGANGenerationError, match="Preprocessing failed"):
            generator.generate(pd.DataFrame(), num_rows=10)

    def test_all_pii_columns(self, generator):
        df = pd.DataFrame(
            {"name": ["A", "B", "C"], "email": ["a@b.c", "b@c.d", "c@d.e"]}
        )
        with pytest.raises(CTGANGenerationError, match="Preprocessing failed"):
            generator.generate(df, num_rows=10)

    def test_sdv_not_installed(self, generator):
        import builtins

        original_import = builtins.__import__

        def mock_import(name, *args, **kwargs):
            if "sdv" in name:
                raise ImportError("No module named 'sdv'")
            return original_import(name, *args, **kwargs)

        with patch("builtins.__import__", side_effect=mock_import):
            with pytest.raises(CTGANGenerationError, match="SDV is not installed"):
                generator.generate(pd.DataFrame({"x": [1, 2, 3]}), num_rows=5)


class TestCTGANRequest:
    def test_default_values(self):
        req = CTGANRequest()
        assert req.num_rows == 1_000
        assert req.epochs == 100

    def test_custom_values(self):
        req = CTGANRequest(num_rows=500, epochs=50, batch_size=200)
        assert req.num_rows == 500

    def test_invalid_num_rows(self):
        with pytest.raises(Exception):
            CTGANRequest(num_rows=0)

    def test_invalid_epochs(self):
        with pytest.raises(Exception):
            CTGANRequest(epochs=0)

    def test_empty_generator_dim(self):
        with pytest.raises(Exception):
            CTGANRequest(generator_dim=[])


class TestCTGANBatchSize:
    def test_small_datasets_use_pack_size(self):
        assert _resolve_ctgan_batch_size(batch_size=3, row_count=3) == 10

    def test_large_batches_stay_multiple_of_pack_size(self):
        assert _resolve_ctgan_batch_size(batch_size=503, row_count=1_000) == 500
