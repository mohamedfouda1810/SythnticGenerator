"""
CTGAN-based Synthetic Data Generator.

Uses the SDV library's CTGANSynthesizer to learn the joint distribution
of a real tabular dataset and produce synthetic rows that preserve
statistical properties of the original data.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import pandas as pd

from ai_engine.preprocessor import DataPreprocessor, PreprocessorError
from ai_engine.schemas import (
    CTGANRequest,
    GenerationMode,
    GenerationResult,
    PreprocessorResult,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PREVIEW_ROWS: int = 10
CTGAN_PACK_SIZE: int = 10


def _resolve_ctgan_batch_size(batch_size: int, row_count: int, pac: int = CTGAN_PACK_SIZE) -> int:
    """
    Return a CTGAN-safe batch size.

    CTGAN's discriminator groups rows in packs, so the effective batch size
    must be a positive multiple of ``pac``. Tiny uploads are sampled with
    replacement inside CTGAN, so using ``pac`` is safer than shrinking to the
    source row count.
    """
    if batch_size < 1:
        batch_size = pac

    capped = min(batch_size, max(row_count, pac))
    resolved = (capped // pac) * pac
    return max(pac, resolved)


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------


class CTGANGenerationError(Exception):
    """Raised when CTGAN training or sampling fails."""


# ---------------------------------------------------------------------------
# Generator class
# ---------------------------------------------------------------------------


class CTGANGenerator:
    """
    Generates synthetic tabular data using CTGAN (Conditional Tabular GAN).

    Typical usage::

        gen = CTGANGenerator()
        result = gen.generate(real_df, num_rows=500, epochs=50)
        synthetic_df = result  # pandas DataFrame
    """

    def __init__(self) -> None:
        """Initialise the CTGAN generator."""
        self._preprocessor = DataPreprocessor(remove_pii=True)
        self._synthesizer: Any = None  # will hold CTGANSynthesizer after fit

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(
        self,
        real_data: pd.DataFrame,
        num_rows: int = 1_000,
        epochs: int = 100,
        batch_size: int = 500,
        generator_dim: Optional[list] = None,
        discriminator_dim: Optional[list] = None,
        remove_pii: bool = True,
        preprocessor_result: Optional[PreprocessorResult] = None,
    ) -> pd.DataFrame:
        """
        Train CTGAN on *real_data* and generate *num_rows* synthetic rows.

        Args:
            real_data: The original (real) DataFrame to learn from.
            num_rows: Number of synthetic rows to produce.
            epochs: Training epochs for the GAN.
            batch_size: Mini-batch size during training.
            generator_dim: Hidden-layer sizes for the generator network.
            discriminator_dim: Hidden-layer sizes for the discriminator.
            remove_pii: Whether to auto-remove PII columns.
            preprocessor_result: Pre-computed preprocessing metadata.
                If ``None``, the preprocessor is run automatically.

        Returns:
            A ``pd.DataFrame`` containing the synthetic data.

        Raises:
            CTGANGenerationError: On any training / sampling failure.
        """
        generator_dim = generator_dim or [128, 128]
        discriminator_dim = discriminator_dim or [128, 128]

        try:
            # Lazy import so the module can be loaded even without SDV
            import torch
            from sdv.metadata import Metadata
            from sdv.single_table import CTGANSynthesizer
            
            # Optimization: limit torch threads to 1 to prevent over-parallelization 
            # and potential hangs in background thread pools.
            torch.set_num_threads(1)
            logger.info("Setting torch.num_threads(1) for background execution. Architecture: %s", generator_dim)
        except ImportError as exc:
            raise CTGANGenerationError(
                "SDV is not installed, or Torch is missing. Install them with: pip install sdv torch"
            ) from exc

        # --- Preprocess -----------------------------------------------
        try:
            logger.info("Preprocessing data for CTGAN...")
            if preprocessor_result is None:
                self._preprocessor.remove_pii = remove_pii
                clean_df, prep_result = self._preprocessor.fit_transform(real_data)
            else:
                clean_df = real_data.copy()
                prep_result = preprocessor_result
            logger.info("Preprocessed data shape: %s", clean_df.shape)
        except PreprocessorError as exc:
            raise CTGANGenerationError(f"Preprocessing failed: {exc}") from exc

        # --- Build SDV metadata ----------------------------------------
        try:
            logger.info("Building SDV metadata...")
            meta_dict = self._preprocessor.get_sdv_metadata_dict(prep_result)

            id_cols = [
                c for c, s in meta_dict["columns"].items() if s["sdtype"] == "id"
            ]
            primary_key = next(
                (
                    col
                    for col in id_cols
                    if col in clean_df.columns
                    and clean_df[col].notna().all()
                    and clean_df[col].is_unique
                ),
                None,
            )
            if primary_key:
                meta_dict["primary_key"] = primary_key
                logger.info(
                    "Detected unique ID column. Setting '%s' as primary key for SDV.",
                    primary_key,
                )
            elif id_cols:
                logger.info(
                    "Detected ID columns %s, but none are unique enough for a primary key.",
                    id_cols,
                )

            metadata = Metadata.load_from_dict(meta_dict)
            metadata.validate()
            logger.info("Metadata validated.")
        except Exception as exc:
            logger.error("Metadata validation failed: %s", exc)
            raise CTGANGenerationError(
                f"Failed to build or validate SDV metadata: {exc}"
            ) from exc

        # --- Train CTGAN -----------------------------------------------
        try:
            actual_batch_size = _resolve_ctgan_batch_size(batch_size, len(clean_df))
            
            logger.info(
                "Starting CTGAN training: epochs=%d, batch_size=%d, rows=%d, cols=%d",
                epochs,
                actual_batch_size,
                len(clean_df),
                len(clean_df.columns),
            )
            
            # Optimization: 
            # 1. Force enable_gpu=False for stability in background threads on CPU.
            # 2. Set verbose=False to disable TQDM which can hang in some environments.
            self._synthesizer = CTGANSynthesizer(
                metadata,
                epochs=epochs,
                batch_size=actual_batch_size,
                generator_dim=tuple(generator_dim),
                discriminator_dim=tuple(discriminator_dim),
                verbose=False,
                pac=CTGAN_PACK_SIZE,
                enable_gpu=False,
            )

            start_fit = time.time()
            logger.info("Starting actual CTGAN training loop for %d epochs...", epochs)
            self._synthesizer.fit(clean_df)
            logger.info("CTGAN training loop COMPLETED in %.2fs. Starting sampling...", time.time() - start_fit)

        except Exception as exc:
            logger.exception("CTGAN fit crashed")
            raise CTGANGenerationError(f"CTGAN training failed: {exc}") from exc

        # --- Sample synthetic data -------------------------------------
        try:
            logger.info("Sampling %d synthetic rows...", num_rows)
            synthetic_df: pd.DataFrame = self._synthesizer.sample(num_rows=num_rows)
            logger.info("Sampling COMPLETED. Columns: %s", list(synthetic_df.columns))
        except Exception as exc:
            logger.exception("CTGAN sample crashed")
            raise CTGANGenerationError(f"CTGAN sampling failed: {exc}") from exc

        logger.info(
            "Generated %d synthetic rows with %d columns.",
            num_rows,
            len(synthetic_df.columns),
        )
        return synthetic_df

    def generate_from_request(
        self,
        real_data: pd.DataFrame,
        request: CTGANRequest,
    ) -> GenerationResult:
        """
        High-level helper that accepts a ``CTGANRequest`` schema.

        Args:
            real_data: Original DataFrame.
            request: Validated request parameters.

        Returns:
            A ``GenerationResult`` wrapper.
        """
        synthetic_df = self.generate(
            real_data=real_data,
            num_rows=request.num_rows,
            epochs=request.epochs,
            batch_size=request.batch_size,
            generator_dim=request.generator_dim,
            discriminator_dim=request.discriminator_dim,
            remove_pii=request.remove_pii,
        )

        preview = synthetic_df.head(PREVIEW_ROWS).to_dict(orient="records")

        return GenerationResult(
            mode=GenerationMode.CTGAN,
            num_rows=len(synthetic_df),
            columns=list(synthetic_df.columns),
            preview_rows=preview,
        )
