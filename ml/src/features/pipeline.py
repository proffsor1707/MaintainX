from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.features.engineering import ENGINEERED_FEATURE_COLUMNS, FailureRiskFeatureEngineer


def build_preprocessing_pipeline() -> Pipeline:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
            ("scaler", StandardScaler()),
        ]
    )
    preprocessing = ColumnTransformer(
        transformers=[("numeric", numeric_pipeline, list(ENGINEERED_FEATURE_COLUMNS))],
        remainder="drop",
    )
    return preprocessing


def build_feature_pipeline(preprocessing: Pipeline | ColumnTransformer | None = None) -> Pipeline:
    return Pipeline(
        steps=[
            ("feature_engineering", FailureRiskFeatureEngineer()),
            ("preprocessing", preprocessing or build_preprocessing_pipeline()),
        ]
    )