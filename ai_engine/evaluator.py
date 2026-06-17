"""
Synthetic Data Quality Evaluator.

Compares real and synthetic DataFrames across multiple dimensions:
- Column shape similarity (KS test for numerical, TVD for categorical)
- Correlation matrix difference (Frobenius norm)
- Missing value rates
- Overall aggregated quality score (0-100)
"""

from __future__ import annotations

import logging
from typing import Dict, List

import numpy as np
import pandas as pd
from scipy import stats as sp_stats

from ai_engine.schemas import ColumnMetric, EvaluationResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

QUALITY_WEIGHT_SHAPE: float = 0.50
QUALITY_WEIGHT_CORRELATION: float = 0.30
QUALITY_WEIGHT_MISSING: float = 0.20

# Maximum expected Frobenius-norm difference (for normalisation)
MAX_CORR_DIFF_NORM: float = 10.0


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class EvaluatorError(Exception):
    """Raised when evaluation cannot proceed."""


# ---------------------------------------------------------------------------
# Evaluator class
# ---------------------------------------------------------------------------


class DataEvaluator:
    """
    Evaluates the quality of synthetic data by comparing it against real data.

    Usage::

        evaluator = DataEvaluator()
        result = evaluator.evaluate(real_df, synthetic_df)
        print(result.overall_quality_score)
        print(result.summary)
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def evaluate(
        self,
        real_data: pd.DataFrame,
        synthetic_data: pd.DataFrame,
    ) -> EvaluationResult:
        """
        Run all quality checks comparing real vs synthetic data.

        Args:
            real_data: The original (ground-truth) DataFrame.
            synthetic_data: The generated DataFrame to evaluate.

        Returns:
            An ``EvaluationResult`` with per-column metrics, correlation diff,
            missing-value rates, overall score, and a text summary.

        Raises:
            EvaluatorError: If inputs are invalid or incompatible.
        """
        self._validate_inputs(real_data, synthetic_data)

        # Align columns: only evaluate columns present in both
        common_cols = [c for c in real_data.columns if c in synthetic_data.columns]
        if not common_cols:
            raise EvaluatorError(
                "No overlapping columns between real and synthetic data."
            )

        real = real_data[common_cols].copy()
        synth = synthetic_data[common_cols].copy()

        # 1. Column-shape metrics
        column_metrics = self._compute_column_metrics(real, synth, common_cols)

        # 2. Correlation difference
        corr_diff = self._compute_correlation_difference(real, synth)

        # 3. Missing value rates
        missing_rates = self._compute_missing_value_rates(synth)

        # 4. Overall score
        overall_score = self._compute_overall_score(
            column_metrics, corr_diff, missing_rates
        )

        # 5. Summary
        summary = self._generate_summary(
            column_metrics, corr_diff, missing_rates, overall_score
        )

        return EvaluationResult(
            column_metrics=column_metrics,
            correlation_difference=corr_diff,
            missing_value_rates=missing_rates,
            overall_quality_score=overall_score,
            summary=summary,
        )

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_inputs(
        real_data: pd.DataFrame,
        synthetic_data: pd.DataFrame,
    ) -> None:
        """Raise ``EvaluatorError`` if inputs are invalid."""
        if not isinstance(real_data, pd.DataFrame):
            raise EvaluatorError("real_data must be a pandas DataFrame.")
        if not isinstance(synthetic_data, pd.DataFrame):
            raise EvaluatorError("synthetic_data must be a pandas DataFrame.")
        if real_data.empty:
            raise EvaluatorError("real_data is empty.")
        if synthetic_data.empty:
            raise EvaluatorError("synthetic_data is empty.")

    # ------------------------------------------------------------------
    # Column-shape metrics
    # ------------------------------------------------------------------

    def _compute_column_metrics(
        self,
        real: pd.DataFrame,
        synth: pd.DataFrame,
        columns: List[str],
    ) -> List[ColumnMetric]:
        """Compute per-column shape similarity."""
        metrics: List[ColumnMetric] = []

        for col in columns:
            real_col = real[col].dropna()
            synth_col = synth[col].dropna()

            if real_col.empty or synth_col.empty:
                metrics.append(
                    ColumnMetric(
                        column_name=col,
                        metric_name="skipped",
                        score=1.0,
                        similarity=0.0,
                    )
                )
                continue

            if pd.api.types.is_numeric_dtype(real_col):
                metric = self._ks_test(real_col, synth_col, col)
            else:
                metric = self._tvd(real_col, synth_col, col)

            metrics.append(metric)

        return metrics

    @staticmethod
    def _ks_test(
        real_col: pd.Series,
        synth_col: pd.Series,
        col_name: str,
    ) -> ColumnMetric:
        """Kolmogorov–Smirnov test for numerical columns."""
        try:
            stat, _ = sp_stats.ks_2samp(real_col.astype(float), synth_col.astype(float))
        except Exception:
            stat = 1.0

        similarity = max(0.0, (1.0 - stat)) * 100.0
        return ColumnMetric(
            column_name=col_name,
            metric_name="ks_statistic",
            score=round(stat, 4),
            similarity=round(similarity, 2),
        )

    @staticmethod
    def _tvd(
        real_col: pd.Series,
        synth_col: pd.Series,
        col_name: str,
    ) -> ColumnMetric:
        """Total Variation Distance for categorical columns."""
        try:
            real_dist = real_col.value_counts(normalize=True)
            synth_dist = synth_col.value_counts(normalize=True)

            # Align on all categories
            all_cats = set(real_dist.index) | set(synth_dist.index)
            tvd = 0.0
            for cat in all_cats:
                p = real_dist.get(cat, 0.0)
                q = synth_dist.get(cat, 0.0)
                tvd += abs(p - q)
            tvd /= 2.0  # TVD ∈ [0, 1]
        except Exception:
            tvd = 1.0

        similarity = max(0.0, (1.0 - tvd)) * 100.0
        return ColumnMetric(
            column_name=col_name,
            metric_name="tvd",
            score=round(tvd, 4),
            similarity=round(similarity, 2),
        )

    # ------------------------------------------------------------------
    # Correlation difference
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_correlation_difference(
        real: pd.DataFrame,
        synth: pd.DataFrame,
    ) -> float:
        """Compute Frobenius norm of the correlation-matrix difference."""
        numeric_cols = real.select_dtypes(include=[np.number]).columns.tolist()
        numeric_cols = [c for c in numeric_cols if c in synth.columns]

        if len(numeric_cols) < 2:
            return 0.0

        try:
            real_corr = real[numeric_cols].corr().fillna(0).values
            synth_corr = synth[numeric_cols].corr().fillna(0).values
            diff = np.linalg.norm(real_corr - synth_corr, ord="fro")
            return round(float(diff), 4)
        except Exception:
            return 0.0

    # ------------------------------------------------------------------
    # Missing value rates
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_missing_value_rates(
        synth: pd.DataFrame,
    ) -> Dict[str, float]:
        """Return per-column missing-value rate in the synthetic data."""
        rates: Dict[str, float] = {}
        n = len(synth)
        if n == 0:
            return rates
        for col in synth.columns:
            rate = float(synth[col].isna().sum()) / n
            rates[col] = round(rate, 4)
        return rates

    # ------------------------------------------------------------------
    # Overall quality score
    # ------------------------------------------------------------------

    def _compute_overall_score(
        self,
        column_metrics: List[ColumnMetric],
        corr_diff: float,
        missing_rates: Dict[str, float],
    ) -> float:
        """
        Aggregate individual metrics into a single 0-100 quality score.

        Weights:
            - Shape similarity: 50%
            - Correlation preservation: 30%
            - Missing-value penalty: 20%
        """
        # Average column similarity
        if column_metrics:
            shape_score = float(np.mean([m.similarity for m in column_metrics]))
        else:
            shape_score = 0.0

        # Correlation score (invert diff → similarity)
        # Refined normalization: Use theoretical max based on n columns
        # Max Frobenius norm of diff between two corr matrices is 2*sqrt(n*(n-1))
        # since diagonal is always 1 (diff=0).
        n_numeric = len([m for m in column_metrics if m.metric_name == "ks_statistic"])
        if n_numeric > 1:
            max_diff = 2.0 * np.sqrt(n_numeric * (n_numeric - 1))
            norm_diff = min(corr_diff / max_diff, 1.0)
        else:
            norm_diff = 0.0
            
        corr_score = float((1.0 - norm_diff) * 100.0)

        # Missing-value score (100 = no missing, 0 = all missing)
        if missing_rates:
            avg_missing = float(np.mean(list(missing_rates.values())))
        else:
            avg_missing = 0.0
        missing_score = float((1.0 - avg_missing) * 100.0)

        overall = float(
            QUALITY_WEIGHT_SHAPE * shape_score
            + QUALITY_WEIGHT_CORRELATION * corr_score
            + QUALITY_WEIGHT_MISSING * missing_score
        )

        return float(round(min(max(overall, 0.0), 100.0), 2))

    # ------------------------------------------------------------------
    # Text summary
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_summary(
        column_metrics: List[ColumnMetric],
        corr_diff: float,
        missing_rates: Dict[str, float],
        overall_score: float,
    ) -> str:
        """Produce a human-readable quality report."""
        lines: List[str] = []
        lines.append("=" * 60)
        lines.append("  SYNTHETIC DATA QUALITY REPORT")
        lines.append("=" * 60)
        lines.append("")

        # Overall
        grade = (
            "Excellent"
            if overall_score >= 90
            else "Good"
            if overall_score >= 75
            else "Fair"
            if overall_score >= 50
            else "Poor"
        )
        lines.append(f"Overall Quality Score: {overall_score:.1f}/100  ({grade})")
        lines.append("")

        # Per-column
        lines.append("Column Shape Similarity:")
        lines.append("-" * 40)
        for m in column_metrics:
            bar_len = int(m.similarity / 5)
            bar = "█" * bar_len + "░" * (20 - bar_len)
            lines.append(
                f"  {m.column_name:<20s} {bar} {m.similarity:5.1f}%  ({m.metric_name})"
            )
        lines.append("")

        # Correlation
        lines.append(f"Correlation Matrix Difference (Frobenius): {corr_diff:.4f}")
        lines.append("")

        # Missing values
        total_missing = sum(missing_rates.values())
        if total_missing == 0:
            lines.append("Missing Values: None detected ✓")
        else:
            lines.append("Missing Value Rates:")
            for col, rate in missing_rates.items():
                if rate > 0:
                    lines.append(f"  {col:<20s} {rate * 100:.2f}%")
        lines.append("")
        lines.append("=" * 60)

        return "\n".join(lines)
