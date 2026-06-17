"""
Tests for the MimesisGenerator.

Covers all supported field types, schema validation, edge cases, and large datasets.
"""

from __future__ import annotations

import pytest

from ai_engine.mimesis_generator import MimesisGenerationError, MimesisGenerator
from ai_engine.schemas import MimesisFieldSpec, MimesisFieldType, MimesisRequest


@pytest.fixture
def generator() -> MimesisGenerator:
    return MimesisGenerator(locale="en")


class TestPersonalFields:
    def test_name(self, generator):
        df = generator.generate({"full_name": {"type": "name"}}, num_rows=10)
        assert len(df) == 10
        assert all(isinstance(v, str) and len(v) > 0 for v in df["full_name"])

    def test_first_last_name(self, generator):
        df = generator.generate(
            {
                "first": {"type": "first_name"},
                "last": {"type": "last_name"},
            },
            num_rows=10,
        )
        assert "first" in df.columns and "last" in df.columns

    def test_email(self, generator):
        df = generator.generate({"email": {"type": "email"}}, num_rows=10)
        assert all("@" in v for v in df["email"])

    def test_phone(self, generator):
        df = generator.generate({"phone": {"type": "phone"}}, num_rows=10)
        assert len(df) == 10

    def test_gender(self, generator):
        df = generator.generate({"gender": {"type": "gender"}}, num_rows=50)
        assert set(df["gender"]).issubset({"Male", "Female", "Non-binary"})

    def test_age(self, generator):
        df = generator.generate(
            {"age": {"type": "age", "options": {"min": 20, "max": 30}}}, num_rows=100
        )
        assert df["age"].min() >= 20
        assert df["age"].max() <= 30

    def test_age_defaults(self, generator):
        df = generator.generate({"age": {"type": "age"}}, num_rows=100)
        assert df["age"].min() >= 18
        assert df["age"].max() <= 90


class TestAddressFields:
    def test_address(self, generator):
        df = generator.generate({"addr": {"type": "address"}}, num_rows=5)
        assert all(isinstance(v, str) for v in df["addr"])

    def test_city(self, generator):
        df = generator.generate({"city": {"type": "city"}}, num_rows=5)
        assert len(df) == 5

    def test_country(self, generator):
        df = generator.generate({"country": {"type": "country"}}, num_rows=5)
        assert len(df) == 5


class TestTemporalFields:
    def test_date(self, generator):
        df = generator.generate({"d": {"type": "date"}}, num_rows=10)
        assert all("-" in v for v in df["d"])

    def test_datetime(self, generator):
        df = generator.generate({"dt": {"type": "datetime"}}, num_rows=10)
        assert all("T" in v for v in df["dt"])


class TestNumericFields:
    def test_integer(self, generator):
        df = generator.generate(
            {"val": {"type": "integer", "options": {"min": 0, "max": 100}}}, num_rows=50
        )
        assert df["val"].min() >= 0
        assert df["val"].max() <= 100

    def test_float(self, generator):
        df = generator.generate(
            {
                "val": {
                    "type": "float",
                    "options": {"min": 0.0, "max": 1.0, "decimals": 3},
                }
            },
            num_rows=50,
        )
        assert df["val"].min() >= 0.0
        assert df["val"].max() <= 1.0


class TestCategoricalFields:
    def test_category(self, generator):
        choices = ["A", "B", "C"]
        df = generator.generate(
            {"cat": {"type": "category", "options": {"choices": choices}}}, num_rows=100
        )
        assert set(df["cat"]).issubset(set(choices))

    def test_category_missing_choices(self, generator):
        with pytest.raises(MimesisGenerationError, match="choices"):
            generator.generate({"cat": {"type": "category"}}, num_rows=5)

    def test_boolean(self, generator):
        df = generator.generate({"flag": {"type": "boolean"}}, num_rows=100)
        assert set(df["flag"]).issubset({True, False})

    def test_uuid(self, generator):
        df = generator.generate({"uid": {"type": "uuid"}}, num_rows=10)
        assert df["uid"].nunique() == 10

    def test_id(self, generator):
        df = generator.generate({"row_id": {"type": "id"}}, num_rows=10)
        assert list(df["row_id"]) == list(range(1, 11))


class TestMedicalFields:
    def test_diagnosis(self, generator):
        df = generator.generate({"diag": {"type": "diagnosis"}}, num_rows=20)
        assert all(isinstance(v, str) and len(v) > 0 for v in df["diag"])

    def test_blood_type(self, generator):
        df = generator.generate({"bt": {"type": "blood_type"}}, num_rows=20)
        valid = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
        assert set(df["bt"]).issubset(valid)

    def test_medication(self, generator):
        df = generator.generate({"med": {"type": "medication"}}, num_rows=20)
        assert len(df) == 20

    def test_symptom(self, generator):
        df = generator.generate({"sym": {"type": "symptom"}}, num_rows=20)
        assert len(df) == 20


class TestFinancialFields:
    def test_salary(self, generator):
        df = generator.generate(
            {"sal": {"type": "salary", "options": {"min": 30000, "max": 50000}}},
            num_rows=50,
        )
        assert df["sal"].min() >= 30000
        assert df["sal"].max() <= 50000

    def test_currency(self, generator):
        df = generator.generate({"cur": {"type": "currency"}}, num_rows=10)
        assert len(df) == 10

    def test_iban(self, generator):
        df = generator.generate({"iban": {"type": "iban"}}, num_rows=5)
        assert len(df) == 5


class TestEdgeCases:
    def test_empty_schema(self, generator):
        with pytest.raises(MimesisGenerationError, match="empty"):
            generator.generate({}, num_rows=5)

    def test_zero_rows(self, generator):
        with pytest.raises(MimesisGenerationError, match="num_rows"):
            generator.generate({"x": {"type": "name"}}, num_rows=0)

    def test_large_dataset(self, generator):
        df = generator.generate(
            {"age": {"type": "age"}, "city": {"type": "city"}}, num_rows=10_000
        )
        assert len(df) == 10_000

    def test_single_column(self, generator):
        df = generator.generate(
            {"val": {"type": "integer", "options": {"min": 0, "max": 10}}}, num_rows=5
        )
        assert list(df.columns) == ["val"]


class TestMimesisRequest:
    def test_generate_from_request(self, generator):
        req = MimesisRequest(
            schema={
                "patient": MimesisFieldSpec(type=MimesisFieldType.NAME),
                "age": MimesisFieldSpec(type=MimesisFieldType.AGE),
            },
            num_rows=25,
        )
        result = generator.generate_from_request(req)
        assert result.num_rows == 25
        assert result.mode.value == "mimesis"
        assert "patient" in result.columns
