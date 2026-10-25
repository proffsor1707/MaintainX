from collections.abc import Mapping
from math import isfinite
from typing import Any

import pandas as pd

from app.ml.loader import EXPECTED_INPUT_FEATURES

PERCENT_FEATURES = {"cpu_usage", "memory_usage"}
NON_NEGATIVE_FEATURES = {
    "response_time_ms",
    "request_volume",
    "historical_incidents_30d",
}


class FeatureValidationError(ValueError):
    """Raised when inference input violates the Phase 8 feature contract."""


def prepare_features(features: Mapping[str, Any]) -> pd.DataFrame:
    missing = sorted(set(EXPECTED_INPUT_FEATURES) - set(features))
    unexpected = sorted(set(features) - set(EXPECTED_INPUT_FEATURES))
    if missing:
        raise FeatureValidationError(f"Missing required features: {missing}")
    if unexpected:
        raise FeatureValidationError(f"Unexpected features: {unexpected}")

    validated: dict[str, float | None] = {}
    for name in EXPECTED_INPUT_FEATURES:
        value = features[name]
        if value is None:
            validated[name] = None
            continue
        if isinstance(value, bool):
            raise FeatureValidationError(f"Feature '{name}' must be numeric, not boolean.")
        try:
            numeric_value = float(value)
        except (TypeError, ValueError) as error:
            raise FeatureValidationError(f"Feature '{name}' must be numeric or null.") from error
        if not isfinite(numeric_value):
            raise FeatureValidationError(f"Feature '{name}' must be finite.")
        if name in PERCENT_FEATURES and not 0 <= numeric_value <= 100:
            raise FeatureValidationError(f"Feature '{name}' must be between 0 and 100.")
        if name == "error_rate" and not 0 <= numeric_value <= 1:
            raise FeatureValidationError("Feature 'error_rate' must be between 0 and 1.")
        if name in NON_NEGATIVE_FEATURES and numeric_value < 0:
            raise FeatureValidationError(f"Feature '{name}' must be non-negative.")
        validated[name] = numeric_value

    return pd.DataFrame([validated], columns=EXPECTED_INPUT_FEATURES)