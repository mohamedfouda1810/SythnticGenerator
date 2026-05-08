"""
Mimesis-based Rule-Driven Synthetic Data Generator.

Generates realistic synthetic tabular data using the Mimesis library,
configured through a schema dictionary that maps column names to field
types and optional parameters.
"""

from __future__ import annotations

import logging
import random
import uuid as _uuid
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

import pandas as pd

from ai_engine.schemas import (
    GenerationMode,
    GenerationResult,
    MimesisFieldSpec,
    MimesisFieldType,
    MimesisRequest,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PREVIEW_ROWS: int = 10

# Medical data pools (realistic values for rule-based generation)
DIAGNOSES: List[str] = [
    "Type 2 Diabetes Mellitus",
    "Essential Hypertension",
    "Major Depressive Disorder",
    "Generalized Anxiety Disorder",
    "Asthma",
    "Chronic Obstructive Pulmonary Disease",
    "Coronary Artery Disease",
    "Atrial Fibrillation",
    "Osteoarthritis",
    "Rheumatoid Arthritis",
    "Chronic Kidney Disease",
    "Hypothyroidism",
    "Hyperthyroidism",
    "Iron Deficiency Anemia",
    "Migraine",
    "Gastroesophageal Reflux Disease",
    "Irritable Bowel Syndrome",
    "Urinary Tract Infection",
    "Pneumonia",
    "Congestive Heart Failure",
]

BLOOD_TYPES: List[str] = [
    "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
]

MEDICATIONS: List[str] = [
    "Metformin", "Lisinopril", "Atorvastatin", "Amlodipine",
    "Metoprolol", "Omeprazole", "Losartan", "Albuterol",
    "Gabapentin", "Hydrochlorothiazide", "Sertraline",
    "Acetaminophen", "Ibuprofen", "Amoxicillin", "Prednisone",
    "Levothyroxine", "Furosemide", "Pantoprazole", "Escitalopram",
    "Duloxetine",
]

SYMPTOMS: List[str] = [
    "Fatigue", "Headache", "Nausea", "Dizziness", "Chest Pain",
    "Shortness of Breath", "Back Pain", "Joint Pain", "Fever",
    "Cough", "Abdominal Pain", "Insomnia", "Anxiety",
    "Weight Loss", "Weight Gain", "Blurred Vision", "Palpitations",
    "Swelling", "Numbness", "Tingling",
]

CURRENCIES: List[str] = [
    "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD",
    "CNY", "INR", "BRL", "KRW", "MXN",
]

DEFAULT_AGE_MIN: int = 18
DEFAULT_AGE_MAX: int = 90
DEFAULT_INT_MIN: int = 0
DEFAULT_INT_MAX: int = 1_000_000
DEFAULT_FLOAT_MIN: float = 0.0
DEFAULT_FLOAT_MAX: float = 1_000_000.0
DEFAULT_FLOAT_DECIMALS: int = 2
DEFAULT_SALARY_MIN: float = 25_000.0
DEFAULT_SALARY_MAX: float = 250_000.0


# ---------------------------------------------------------------------------
# Custom exceptions
# ---------------------------------------------------------------------------

class MimesisGenerationError(Exception):
    """Raised when Mimesis generation encounters a problem."""


# ---------------------------------------------------------------------------
# Generator class
# ---------------------------------------------------------------------------

class MimesisGenerator:
    """
    Generates synthetic data using Mimesis providers and custom rules.

    Usage::

        gen = MimesisGenerator()
        schema = {
            "patient_name": {"type": "name", "options": {}},
            "age": {"type": "age", "options": {"min": 18, "max": 65}},
            "diagnosis": {"type": "diagnosis", "options": {}},
        }
        df = gen.generate(schema=schema, num_rows=1000)
    """

    def __init__(self, locale: str = "en") -> None:
        """
        Initialise with the desired locale.

        Args:
            locale: Mimesis locale string (e.g. ``'en'``, ``'de'``).
        """
        self._locale = locale
        self._init_providers()

    # ------------------------------------------------------------------
    # Provider initialisation
    # ------------------------------------------------------------------

    def _init_providers(self) -> None:
        """Lazy-import and instantiate Mimesis providers."""
        try:
            from mimesis import Address, Finance, Person
            from mimesis.locales import Locale

            # Resolve locale — try by name (e.g. "EN") then by value (e.g. "en")
            locale_str = self._locale or "en"
            try:
                locale_enum = Locale[locale_str.upper()]
            except KeyError:
                try:
                    locale_enum = Locale(locale_str.lower())
                except ValueError:
                    locale_enum = Locale.EN

            self._person = Person(locale_enum)
            self._address = Address(locale_enum)
            self._finance = Finance(locale_enum)
        except ImportError as exc:
            raise MimesisGenerationError(
                "Mimesis is not installed. Install with: pip install mimesis"
            ) from exc
        except Exception as exc:
            raise MimesisGenerationError(
                f"Failed to initialise Mimesis providers: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(
        self,
        schema: Dict[str, Any],
        num_rows: int = 1_000,
    ) -> pd.DataFrame:
        """
        Generate synthetic data based on the given schema.

        Args:
            schema: Mapping of ``column_name`` → field spec.
                Each value is either a ``MimesisFieldSpec`` or a plain dict
                with keys ``type`` (str) and optionally ``options`` (dict).
            num_rows: Number of rows to generate.

        Returns:
            DataFrame with the generated data.

        Raises:
            MimesisGenerationError: On invalid schema or generation failure.
        """
        if not schema:
            raise MimesisGenerationError("Schema must not be empty.")

        if num_rows < 1:
            raise MimesisGenerationError("num_rows must be at least 1.")

        # Normalise schema entries into MimesisFieldSpec
        normalised: Dict[str, MimesisFieldSpec] = {}
        for col_name, spec in schema.items():
            if isinstance(spec, MimesisFieldSpec):
                normalised[col_name] = spec
            elif isinstance(spec, dict):
                try:
                    normalised[col_name] = MimesisFieldSpec(**spec)
                except Exception as exc:
                    raise MimesisGenerationError(
                        f"Invalid spec for column '{col_name}': {exc}"
                    ) from exc
            else:
                raise MimesisGenerationError(
                    f"Spec for column '{col_name}' must be a dict or MimesisFieldSpec."
                )

        # Build generator functions per column
        generators: Dict[str, Callable[[], Any]] = {}
        for col_name, spec in normalised.items():
            generators[col_name] = self._build_field_generator(col_name, spec)

        # Generate rows
        data: Dict[str, List[Any]] = {col: [] for col in generators}
        for _ in range(num_rows):
            for col_name, gen_fn in generators.items():
                data[col_name].append(gen_fn())

        df = pd.DataFrame(data)
        logger.info("Mimesis generated %d rows × %d columns.", num_rows, len(df.columns))
        return df

    def generate_from_request(self, request: MimesisRequest) -> GenerationResult:
        """
        High-level helper that accepts a ``MimesisRequest`` schema.

        Args:
            request: Validated request parameters.

        Returns:
            A ``GenerationResult`` wrapper.
        """
        # Convert MimesisFieldSpec objects to plain dicts for generate()
        schema_dict = {
            col: spec for col, spec in request.schema_definition.items()
        }

        if request.locale != self._locale:
            self._locale = request.locale
            self._init_providers()

        synthetic_df = self.generate(schema=schema_dict, num_rows=request.num_rows)
        preview = synthetic_df.head(PREVIEW_ROWS).to_dict(orient="records")

        return GenerationResult(
            mode=GenerationMode.MIMESIS,
            num_rows=len(synthetic_df),
            columns=list(synthetic_df.columns),
            preview_rows=preview,
        )

    # ------------------------------------------------------------------
    # Field generator factory
    # ------------------------------------------------------------------

    def _build_field_generator(
        self,
        col_name: str,
        spec: MimesisFieldSpec,
    ) -> Callable[[], Any]:
        """
        Return a zero-argument callable that produces one value for *spec*.

        Args:
            col_name: Column name (for error messages).
            spec: The field specification.

        Returns:
            A callable ``() -> value``.

        Raises:
            MimesisGenerationError: If the field type is not supported.
        """
        ft = spec.type
        opts = spec.options

        # --- Personal --------------------------------------------------
        if ft == MimesisFieldType.NAME:
            return lambda: self._person.full_name()
        if ft == MimesisFieldType.FIRST_NAME:
            return lambda: self._person.first_name()
        if ft == MimesisFieldType.LAST_NAME:
            return lambda: self._person.last_name()
        if ft == MimesisFieldType.EMAIL:
            return lambda: self._person.email()
        if ft == MimesisFieldType.PHONE:
            return lambda: self._person.telephone()
        if ft == MimesisFieldType.GENDER:
            return lambda: random.choice(["Male", "Female", "Non-binary"])
        if ft == MimesisFieldType.AGE:
            age_min = opts.get("min", DEFAULT_AGE_MIN)
            age_max = opts.get("max", DEFAULT_AGE_MAX)
            return lambda: random.randint(age_min, age_max)

        # --- Address ---------------------------------------------------
        if ft == MimesisFieldType.ADDRESS:
            return lambda: self._address.address()
        if ft == MimesisFieldType.CITY:
            return lambda: self._address.city()
        if ft == MimesisFieldType.COUNTRY:
            return lambda: self._address.country()

        # --- Temporal --------------------------------------------------
        if ft == MimesisFieldType.DATE:
            return lambda: self._random_date(opts).strftime("%Y-%m-%d")
        if ft == MimesisFieldType.DATETIME:
            return lambda: self._random_date(opts).isoformat()

        # --- Numeric ---------------------------------------------------
        if ft == MimesisFieldType.INTEGER:
            int_min = opts.get("min", DEFAULT_INT_MIN)
            int_max = opts.get("max", DEFAULT_INT_MAX)
            return lambda: random.randint(int_min, int_max)
        if ft == MimesisFieldType.FLOAT:
            f_min = opts.get("min", DEFAULT_FLOAT_MIN)
            f_max = opts.get("max", DEFAULT_FLOAT_MAX)
            decimals = opts.get("decimals", DEFAULT_FLOAT_DECIMALS)
            return lambda: round(random.uniform(f_min, f_max), decimals)

        # --- Categorical / misc ----------------------------------------
        if ft == MimesisFieldType.CATEGORY:
            choices = opts.get("choices", [])
            if not choices:
                raise MimesisGenerationError(
                    f"Column '{col_name}': 'category' type requires 'choices' in options."
                )
            return lambda: random.choice(choices)
        if ft == MimesisFieldType.BOOLEAN:
            return lambda: random.choice([True, False])
        if ft == MimesisFieldType.UUID:
            return lambda: str(_uuid.uuid4())
        if ft == MimesisFieldType.ID:
            counter = {"n": 0}

            def _next_id() -> int:
                counter["n"] += 1
                return counter["n"]

            return _next_id

        # --- Medical ---------------------------------------------------
        if ft == MimesisFieldType.DIAGNOSIS:
            return lambda: random.choice(DIAGNOSES)
        if ft == MimesisFieldType.BLOOD_TYPE:
            return lambda: random.choice(BLOOD_TYPES)
        if ft == MimesisFieldType.MEDICATION:
            return lambda: random.choice(MEDICATIONS)
        if ft == MimesisFieldType.SYMPTOM:
            return lambda: random.choice(SYMPTOMS)

        # --- Financial -------------------------------------------------
        if ft == MimesisFieldType.SALARY:
            s_min = opts.get("min", DEFAULT_SALARY_MIN)
            s_max = opts.get("max", DEFAULT_SALARY_MAX)
            return lambda: round(random.uniform(s_min, s_max), 2)
        if ft == MimesisFieldType.CURRENCY:
            return lambda: random.choice(CURRENCIES)
        if ft == MimesisFieldType.IBAN:
            return lambda: self._generate_iban()

        raise MimesisGenerationError(
            f"Unsupported field type '{ft}' for column '{col_name}'."
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_iban() -> str:
        """Generate a realistic-looking fake IBAN."""
        country_codes = ["DE", "FR", "GB", "ES", "IT", "NL", "BE", "AT", "CH", "PL"]
        country = random.choice(country_codes)
        check_digits = f"{random.randint(10, 99)}"
        bban = "".join([str(random.randint(0, 9)) for _ in range(18)])
        return f"{country}{check_digits}{bban}"

    @staticmethod
    def _random_date(opts: Dict[str, Any]) -> datetime:
        """Generate a random datetime within an optional range."""
        start_str = opts.get("start", "2000-01-01")
        end_str = opts.get("end", "2025-12-31")
        start = datetime.strptime(start_str, "%Y-%m-%d")
        end = datetime.strptime(end_str, "%Y-%m-%d")
        delta = (end - start).days
        if delta <= 0:
            return start
        return start + timedelta(days=random.randint(0, delta))
