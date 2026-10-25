from collections.abc import Mapping
from typing import Any, Literal

import numpy as np

from app.ml.loader import ModelBundle, get_model_bundle
from app.ml.preprocessing import prepare_features
from app.schemas.prediction import PredictionResponse

RiskLevel = Literal["low", "moderate", "high", "critical"]


def classify_risk(probability: float) -> RiskLevel:
    if not 0 <= probability <= 1:
        raise ValueError("Failure probability must be between 0 and 1.")
    if probability < 0.25:
        return "low"
    if probability < 0.5:
        return "moderate"
    if probability < 0.75:
        return "high"
    return "critical"


def predict_failure(
    features: Mapping[str, Any],
    *,
    bundle: ModelBundle | None = None,
) -> PredictionResponse:
    model_bundle = bundle or get_model_bundle()
    model_input = prepare_features(features)
    classes = list(model_bundle.pipeline.classes_)
    positive_class_index = classes.index(1)
    probabilities = np.asarray(model_bundle.pipeline.predict_proba(model_input))
    if probabilities.shape != (1, len(classes)):
        raise RuntimeError("Inference model returned an unexpected probability shape.")

    probability = float(probabilities[0, positive_class_index])
    if not np.isfinite(probability) or not 0 <= probability <= 1:
        raise RuntimeError("Inference model returned an invalid failure probability.")

    metadata = model_bundle.metadata
    return PredictionResponse(
        failure_probability=probability,
        risk_level=classify_risk(probability),
        model_version=metadata["model_version"],
        model_name=metadata["model_name"],
        dataset_is_synthetic=bool(metadata.get("dataset_is_synthetic", False)),
    )