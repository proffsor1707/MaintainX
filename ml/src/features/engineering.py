import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.utils.validation import check_is_fitted

from src.data.schema import RAW_FEATURE_COLUMNS

ENGINEERED_FEATURE_COLUMNS = (
    *RAW_FEATURE_COLUMNS,
    "resource_pressure",
    "cpu_memory_pressure",
    "response_error_interaction",
    "prior_incident_indicator",
)


class FailureRiskFeatureEngineer(BaseEstimator, TransformerMixin):
    def fit(self, X: pd.DataFrame, y: pd.Series | None = None) -> "FailureRiskFeatureEngineer":
        missing = sorted(set(RAW_FEATURE_COLUMNS) - set(X.columns))
        if missing:
            raise ValueError(f"Feature input is missing columns: {missing}")
        self.feature_names_in_ = np.asarray(RAW_FEATURE_COLUMNS, dtype=object)
        self.n_features_in_ = len(RAW_FEATURE_COLUMNS)
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        check_is_fitted(self, "feature_names_in_")
        missing = sorted(set(RAW_FEATURE_COLUMNS) - set(X.columns))
        if missing:
            raise ValueError(f"Feature input is missing columns: {missing}")

        features = X.loc[:, RAW_FEATURE_COLUMNS].copy()
        for column in RAW_FEATURE_COLUMNS:
            features[column] = pd.to_numeric(features[column], errors="coerce")

        features["resource_pressure"] = features[["cpu_usage", "memory_usage"]].max(axis=1)
        features["cpu_memory_pressure"] = features["cpu_usage"] * features["memory_usage"] / 10000
        features["response_error_interaction"] = features["response_time_ms"] * features["error_rate"]
        incident_counts = features["historical_incidents_30d"]
        features["prior_incident_indicator"] = (incident_counts > 0).astype(float).where(incident_counts.notna())
        return features.loc[:, ENGINEERED_FEATURE_COLUMNS]

    def get_feature_names_out(self, input_features: object = None) -> np.ndarray:
        check_is_fitted(self, "feature_names_in_")
        return np.asarray(ENGINEERED_FEATURE_COLUMNS, dtype=object)