"""
Tests for the DataEvaluator.

Covers quality metrics, correlation diff, missing values, edge cases,
and known good/bad synthetic data comparisons.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from ai_engine.evaluator import DataEvaluator, EvaluatorError


@pytest.fixture
def evaluator() -> DataEvaluator:
    return DataEvaluator()


@pytest.fixture
def real_df() -> pd.DataFrame:
    np.random.seed(42)
    n = 500
    return pd.DataFrame({
        "age": np.random.randint(18, 90, size=n),
        "glucose": np.random.normal(120, 30, size=n).round(1),
        "bmi": np.random.normal(28, 5, size=n).round(2),
        "outcome": np.random.choice(["Positive", "Negative"], size=n),
    })


class TestGoodSyntheticData:
    """Synthetic data drawn from the same distribution should score high."""

    def test_identical_data_scores_high(self, evaluator, real_df):
        result = evaluator.evaluate(real_df, real_df.copy())
        assert result.overall_quality_score >= 90.0

    def test_similar_distribution(self, evaluator, real_df):
        np.random.seed(99)
        n = 500
        synth = pd.DataFrame({
            "age": np.random.randint(18, 90, size=n),
            "glucose": np.random.normal(120, 30, size=n).round(1),
            "bmi": np.random.normal(28, 5, size=n).round(2),
            "outcome": np.random.choice(["Positive", "Negative"], size=n),
        })
        result = evaluator.evaluate(real_df, synth)
        assert result.overall_quality_score >= 60.0


class TestBadSyntheticData:
    """Clearly different distributions should score low."""

    def test_very_different_data(self, evaluator, real_df):
        np.random.seed(7)
        n = 500
        bad = pd.DataFrame({
            "age": np.random.randint(200, 300, size=n),
            "glucose": np.random.normal(999, 1, size=n).round(1),
            "bmi": np.random.normal(100, 1, size=n).round(2),
            "outcome": np.random.choice(["X", "Y", "Z"], size=n),
        })
        result = evaluator.evaluate(real_df, bad)
        assert result.overall_quality_score < 60.0


class TestColumnMetrics:
    def test_ks_for_numerical(self, evaluator, real_df):
        result = evaluator.evaluate(real_df, real_df.copy())
        numerical_metrics = [m for m in result.column_metrics if m.metric_name == "ks_statistic"]
        assert len(numerical_metrics) > 0
        for m in numerical_metrics:
            assert m.similarity >= 95.0  # identical data

    def test_tvd_for_categorical(self, evaluator, real_df):
        result = evaluator.evaluate(real_df, real_df.copy())
        cat_metrics = [m for m in result.column_metrics if m.metric_name == "tvd"]
        assert len(cat_metrics) > 0
        for m in cat_metrics:
            assert m.similarity >= 95.0


class TestCorrelation:
    def test_identical_correlation(self, evaluator, real_df):
        result = evaluator.evaluate(real_df, real_df.copy())
        assert result.correlation_difference < 0.01

    def test_different_correlation(self, evaluator):
        np.random.seed(42)
        real = pd.DataFrame({"a": range(100), "b": range(100, 200)})
        synth = pd.DataFrame({"a": range(100), "b": list(range(100, 200))[::-1]})
        result = evaluator.evaluate(real, synth)
        assert result.correlation_difference > 0.0


class TestMissingValues:
    def test_no_missing(self, evaluator, real_df):
        result = evaluator.evaluate(real_df, real_df.copy())
        for rate in result.missing_value_rates.values():
            assert rate == 0.0

    def test_with_missing(self, evaluator, real_df):
        synth = real_df.copy()
        synth.loc[0:49, "age"] = np.nan
        result = evaluator.evaluate(real_df, synth)
        assert result.missing_value_rates["age"] > 0.0


class TestSummary:
    def test_summary_is_string(self, evaluator, real_df):
        result = evaluator.evaluate(real_df, real_df.copy())
        assert isinstance(result.summary, str)
        assert "Quality Score" in result.summary


class TestEdgeCases:
    def test_empty_real(self, evaluator):
        with pytest.raises(EvaluatorError, match="empty"):
            evaluator.evaluate(pd.DataFrame(), pd.DataFrame({"x": [1]}))

    def test_empty_synth(self, evaluator, real_df):
        with pytest.raises(EvaluatorError, match="empty"):
            evaluator.evaluate(real_df, pd.DataFrame())

    def test_no_common_columns(self, evaluator):
        r = pd.DataFrame({"a": [1, 2]})
        s = pd.DataFrame({"b": [3, 4]})
        with pytest.raises(EvaluatorError, match="No overlapping"):
            evaluator.evaluate(r, s)

    def test_single_column(self, evaluator):
        r = pd.DataFrame({"x": np.random.normal(0, 1, 100)})
        s = pd.DataFrame({"x": np.random.normal(0, 1, 100)})
        result = evaluator.evaluate(r, s)
        assert 0 <= result.overall_quality_score <= 100

    def test_large_dataset(self, evaluator):
        np.random.seed(42)
        r = pd.DataFrame({"v": np.random.normal(0, 1, 10_000)})
        s = pd.DataFrame({"v": np.random.normal(0, 1, 10_000)})
        result = evaluator.evaluate(r, s)
        assert result.overall_quality_score > 50
