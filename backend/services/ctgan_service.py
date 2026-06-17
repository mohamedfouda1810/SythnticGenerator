"""
CTGAN generation service.

Orchestrates: file reading → preprocessing → CTGAN training → evaluation.
Stores synthetic results in memory with auto-cleanup.
"""

from __future__ import annotations

import io
import logging
import threading
import time
import uuid
from typing import Any, Dict, Optional, Tuple

import pandas as pd

from ai_engine.ctgan_generator import CTGANGenerator
from ai_engine.evaluator import DataEvaluator
from ai_engine.preprocessor import DataPreprocessor

logger = logging.getLogger(__name__)
from backend.services.storage_service import (
    store_result,
    get_stored_result,
    cleanup_expired,
)


def read_uploaded_file(file_bytes: bytes, filename: str) -> pd.DataFrame:
    """
    Read uploaded CSV or XLSX bytes into a DataFrame.

    Args:
        file_bytes: Raw file content.
        filename: Original filename (used to determine format).

    Returns:
        Parsed DataFrame.

    Raises:
        ValueError: If file format is unsupported or parsing fails.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "csv":
        try:
            return pd.read_csv(io.BytesIO(file_bytes))
        except Exception as exc:
            raise ValueError(f"Failed to parse CSV file: {exc}") from exc
    elif ext in ("xlsx", "xls"):
        try:
            return pd.read_excel(io.BytesIO(file_bytes), engine="openpyxl")
        except Exception as exc:
            raise ValueError(f"Failed to parse Excel file: {exc}") from exc
    else:
        raise ValueError(f"Unsupported file extension: .{ext}")


def run_ctgan_pipeline(
    real_df: pd.DataFrame,
    num_rows: int,
    epochs: int,
    remove_pii: bool = True,
) -> Dict[str, Any]:
    """
    Execute the full CTGAN pipeline.

    Returns dict with keys: synthetic_df, preview, quality_metrics, quality_score, download_token.
    """
    preprocessor = DataPreprocessor(remove_pii=remove_pii)
    generator = CTGANGenerator()
    evaluator = DataEvaluator()

    # Preprocess
    clean_df, prep_result = preprocessor.fit_transform(real_df)

    # Generate
    synthetic_df = generator.generate(
        real_data=clean_df,
        num_rows=num_rows,
        epochs=epochs,
        batch_size=500,
        preprocessor_result=prep_result,
    )

    # Evaluate
    eval_result = evaluator.evaluate(clean_df, synthetic_df)

    # Store for download
    token = store_result(synthetic_df)

    return {
        "synthetic_df": synthetic_df,
        "preview": synthetic_df.head(10).to_dict(orient="records"),
        "quality_metrics": {
            "overall_score": eval_result.overall_quality_score,
            "correlation_difference": eval_result.correlation_difference,
            "privacy": {
                "enabled": remove_pii,
                "removed_columns": prep_result.removed_columns,
                "removed_count": len(prep_result.removed_columns),
                "trained_columns": list(clean_df.columns),
            },
            "column_metrics": [
                {
                    "column": m.column_name,
                    "metric": m.metric_name,
                    "score": m.score,
                    "similarity": m.similarity,
                }
                for m in eval_result.column_metrics
            ],
            "missing_value_rates": eval_result.missing_value_rates,
            "summary": eval_result.summary,
        },
        "quality_score": eval_result.overall_quality_score,
        "download_token": token,
        "num_rows_generated": len(synthetic_df),
        "columns": list(synthetic_df.columns),
    }
