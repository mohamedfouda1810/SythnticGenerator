"""
CTGAN-based Synthetic Data Generator.

Uses the SDV library's CTGANSynthesizer to learn the joint distribution
of a real tabular dataset and produce synthetic rows that preserve
statistical properties of the original data.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

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
            preprocessor_result: Pre-computed preprocessing metadata.
                If ``None``, the preprocessor is run automatically.

        Returns:
            A ``pd.DataFrame`` containing the synthetic data.

        Raises:
            CTGANGenerationError: On any training / sampling failure.
        """
        generator_dim = generator_dim or [256, 256]
        discriminator_dim = discriminator_dim or [256, 256]

        try:
            # Lazy import so the module can be loaded even without SDV
            from sdv.metadata import Metadata
            from sdv.single_table import CTGANSynthesizer
        except ImportError as exc:
            raise CTGANGenerationError(
                "SDV is not installed. Install it with: pip install sdv"
            ) from exc

        # --- Preprocess -----------------------------------------------
        try:
            if preprocessor_result is None:
                clean_df, prep_result = self._preprocessor.fit_transform(real_data)
            else:
                clean_df = real_data.copy()
                prep_result = preprocessor_result
        except PreprocessorError as exc:
            raise CTGANGenerationError(
                f"Preprocessing failed: {exc}"
            ) from exc

        # --- Build SDV metadata ----------------------------------------
        try:
            meta_dict = self._preprocessor.get_sdv_metadata_dict(prep_result)
            table_name = Metadata.DEFAULT_SINGLE_TABLE_NAME
            metadata = Metadata.load_from_dict(
                {
                    "tables": {
                        table_name: {
                            "columns": meta_dict["columns"],
                        }
                    }
                }
            )
        except Exception as exc:
            raise CTGANGenerationError(
                f"Failed to build SDV metadata: {exc}"
            ) from exc

        # --- Train CTGAN -----------------------------------------------
        try:
            logger.info(
                "Training CTGAN: epochs=%d, batch_size=%d, rows=%d",
                epochs,
                batch_size,
                len(clean_df),
            )
            self._synthesizer = CTGANSynthesizer(
                metadata,
                epochs=epochs,
                batch_size=batch_size,
                generator_dim=tuple(generator_dim),
                discriminator_dim=tuple(discriminator_dim),
                verbose=False,
            )
            self._synthesizer.fit(clean_df)
        except Exception as exc:
            raise CTGANGenerationError(
                f"CTGAN training failed: {exc}"
            ) from exc

        # --- Sample synthetic data -------------------------------------
        try:
            synthetic_df: pd.DataFrame = self._synthesizer.sample(num_rows=num_rows)
        except Exception as exc:
            raise CTGANGenerationError(
                f"CTGAN sampling failed: {exc}"
            ) from exc

        logger.info("Generated %d synthetic rows with %d columns.", num_rows, len(synthetic_df.columns))
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
        )

        preview = synthetic_df.head(PREVIEW_ROWS).to_dict(orient="records")

        return GenerationResult(
            mode=GenerationMode.CTGAN,
            num_rows=len(synthetic_df),
            columns=list(synthetic_df.columns),
            preview_rows=preview,
        )
