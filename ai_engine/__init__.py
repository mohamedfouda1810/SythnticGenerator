"""
AI Synthetic Data Generation Engine.

This package provides two modes of synthetic data generation:
- CTGAN (data-driven): Uses Conditional Tabular GAN for learning data distributions
- Mimesis (rule-based): Uses schema-based rules for generating realistic fake data

Modules:
    - preprocessor: Data cleaning, type detection, PII removal
    - ctgan_generator: CTGAN-based synthetic data generation
    - mimesis_generator: Rule-based synthetic data generation via Mimesis
    - evaluator: Quality evaluation comparing real vs synthetic data
    - schemas: Pydantic data models for API contracts
"""

from ai_engine.schemas import (
    CTGANRequest,
    MimesisRequest,
    EvaluationResult,
    GenerationResult,
)
from ai_engine.preprocessor import DataPreprocessor
from ai_engine.ctgan_generator import CTGANGenerator
from ai_engine.mimesis_generator import MimesisGenerator
from ai_engine.evaluator import DataEvaluator

__version__ = "1.0.0"

__all__ = [
    "CTGANRequest",
    "MimesisRequest",
    "EvaluationResult",
    "GenerationResult",
    "DataPreprocessor",
    "CTGANGenerator",
    "MimesisGenerator",
    "DataEvaluator",
]
