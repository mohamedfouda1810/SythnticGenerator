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

from ai_engine.ctgan_generator import CTGANGenerationError, CTGANGenerator
from ai_engine.evaluator import DataEvaluator
from ai_engine.preprocessor import DataPreprocessor
from backend.config import settings

logger = logging.getLogger(__name__)

# In-memory store: token → (DataFrame, timestamp)
_result_store: Dict[str, Tuple[pd.DataFrame, float]] = {}
_store_lock = threading.Lock()
RESULT_TTL_SECONDS: int = 3600  # 1 hour


def _cleanup_expired() -> None:
    """Remove results older than TTL."""
    now = time.time()
    with _store_lock:
        expired = [k for k, (_, ts) in _result_store.items() if now - ts > RESULT_TTL_SECONDS]
        for k in expired:
            del _result_store[k]


def store_result(df: pd.DataFrame) -> str:
    """Store a DataFrame and return a download token."""
    _cleanup_expired()
    token = str(uuid.uuid4())
    with _store_lock:
        _result_store[token] = (df, time.time())
    return token


def get_stored_result(token: str) -> Optional[pd.DataFrame]:
    """Retrieve a stored DataFrame by token, or None if expired/missing."""
    _cleanup_expired()
    with _store_lock:
        entry = _result_store.get(token)
    if entry is None:
        return None
    return entry[0]


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
) -> Dict[str, Any]:
    """
    Execute the full CTGAN pipeline.

    Returns dict with keys: synthetic_df, preview, quality_metrics, quality_score, download_token.
    """
    preprocessor = DataPreprocessor(remove_pii=True)
    generator = CTGANGenerator()
    evaluator = DataEvaluator()

    # Preprocess
    clean_df, prep_result = preprocessor.fit_transform(real_df)

    # Generate
    synthetic_df = generator.generate(
        real_data=clean_df,
        num_rows=num_rows,
        epochs=epochs,
        batch_size=min(500, len(clean_df)),
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
