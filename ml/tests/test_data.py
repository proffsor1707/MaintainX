import pandas as pd
import pytest

from src.data.generate_sample import generate_synthetic_dataset
from src.data.load import validate_dataset
from src.data.schema import DatasetValidationError, REQUIRED_COLUMNS


def test_synthetic_generation_is_deterministic() -> None:
    first = generate_synthetic_dataset(rows=80, random_state=19)
    second = generate_synthetic_dataset(rows=80, random_state=19)

    pd.testing.assert_frame_equal(first, second)
    assert tuple(first.columns) == REQUIRED_COLUMNS
    assert set(first["failure_within_24h"].unique()) == {0, 1}


def test_validation_preserves_missing_features_and_rejects_invalid_target() -> None:
    dataset = generate_synthetic_dataset(rows=80)
    dataset.loc[0, "cpu_usage"] = None

    validated = validate_dataset(dataset)

    assert pd.isna(validated.loc[0, "cpu_usage"])
    assert validated["failure_within_24h"].notna().all()

    dataset.loc[0, "failure_within_24h"] = 2
    with pytest.raises(DatasetValidationError, match="0 or 1"):
        validate_dataset(dataset)


def test_validation_rejects_missing_required_column() -> None:
    dataset = generate_synthetic_dataset(rows=80).drop(columns="request_volume")

    with pytest.raises(DatasetValidationError, match="request_volume"):
        validate_dataset(dataset)