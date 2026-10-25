import numpy as np
import pandas as pd

from src.data.schema import RAW_FEATURE_COLUMNS
from src.features.engineering import ENGINEERED_FEATURE_COLUMNS, FailureRiskFeatureEngineer
from src.features.pipeline import build_feature_pipeline


def test_feature_engineering_adds_expected_interactions() -> None:
    input_frame = pd.DataFrame(
        {
            "cpu_usage": [80.0],
            "memory_usage": [50.0],
            "response_time_ms": [200.0],
            "error_rate": [0.05],
            "request_volume": [1000],
            "historical_incidents_30d": [2],
        }
    )

    engineered = FailureRiskFeatureEngineer().fit_transform(input_frame)

    assert tuple(engineered.columns) == ENGINEERED_FEATURE_COLUMNS
    assert engineered.loc[0, "resource_pressure"] == 80.0
    assert engineered.loc[0, "cpu_memory_pressure"] == 0.4
    assert engineered.loc[0, "response_error_interaction"] == 10.0
    assert engineered.loc[0, "prior_incident_indicator"] == 1.0


def test_preprocessing_imputes_missing_inputs_and_returns_finite_values() -> None:
    input_frame = pd.DataFrame(
        {
            "cpu_usage": [20.0, np.nan, 90.0],
            "memory_usage": [30.0, 40.0, 95.0],
            "response_time_ms": [100.0, 120.0, 900.0],
            "error_rate": [0.01, np.nan, 0.2],
            "request_volume": [100, 200, 300],
            "historical_incidents_30d": [0, 1, np.nan],
        },
        columns=RAW_FEATURE_COLUMNS,
    )

    transformed = build_feature_pipeline().fit_transform(input_frame)

    assert transformed.shape == (3, len(ENGINEERED_FEATURE_COLUMNS))
    assert np.isfinite(transformed).all()


def test_missing_incident_count_remains_missing_until_preprocessing() -> None:
    input_frame = pd.DataFrame(
        {
            "cpu_usage": [30.0, 60.0],
            "memory_usage": [40.0, 70.0],
            "response_time_ms": [100.0, 200.0],
            "error_rate": [0.01, 0.02],
            "request_volume": [100, 200],
            "historical_incidents_30d": [np.nan, 2],
        }
    )

    engineered = FailureRiskFeatureEngineer().fit_transform(input_frame)
    transformed = build_feature_pipeline().fit_transform(input_frame)

    assert np.isnan(engineered.loc[0, "prior_incident_indicator"])
    assert np.isfinite(transformed).all()