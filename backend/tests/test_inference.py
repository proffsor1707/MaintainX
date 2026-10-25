import json
from pathlib import Path
from importlib.metadata import version

import pytest
from pydantic import ValidationError

from app.ml import loader
from app.ml.loader import ModelArtifactError, load_model_bundle
from app.ml.predictor import classify_risk, predict_failure
from app.ml.preprocessing import FeatureValidationError, prepare_features
from app.schemas.prediction import PredictionRequest

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = REPOSITORY_ROOT / "ml" / "models" / "inference_pipeline.joblib"
requires_model_artifact = pytest.mark.skipif(
    not MODEL_PATH.is_file(),
    reason="The exported model artifact is external/ignored and is not present in a clean checkout.",
)
VALID_FEATURES = {
    "cpu_usage": 67.0,
    "memory_usage": 72.0,
    "response_time_ms": 115.0,
    "error_rate": 0.025,
    "request_volume": 2400,
    "historical_incidents_30d": 1,
}


@requires_model_artifact
def test_model_artifact_loads_with_metadata() -> None:
    bundle = load_model_bundle(MODEL_PATH)

    assert callable(bundle.pipeline.predict_proba)
    assert bundle.metadata["model_version"] == "1.0.0"
    assert bundle.metadata["dataset_is_synthetic"] is True


@requires_model_artifact
def test_model_bundle_is_loaded_once(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = 0
    original_loader = loader.load_model_bundle

    def counted_loader():
        nonlocal calls
        calls += 1
        return original_loader(MODEL_PATH)

    loader.get_model_bundle.cache_clear()
    monkeypatch.setattr(loader, "load_model_bundle", counted_loader)

    first = loader.get_model_bundle()
    second = loader.get_model_bundle()

    assert first is second
    assert calls == 1
    loader.get_model_bundle.cache_clear()


@requires_model_artifact
def test_valid_prediction_returns_probability_and_metadata() -> None:
    bundle = load_model_bundle(MODEL_PATH)

    response = predict_failure(VALID_FEATURES, bundle=bundle)

    assert 0 <= response.failure_probability <= 1
    assert response.risk_level == classify_risk(response.failure_probability)
    assert response.model_version == "1.0.0"
    assert response.dataset_is_synthetic is True


@requires_model_artifact
def test_prediction_is_deterministic() -> None:
    bundle = load_model_bundle(MODEL_PATH)

    first = predict_failure(VALID_FEATURES, bundle=bundle)
    second = predict_failure(VALID_FEATURES, bundle=bundle)

    assert first.failure_probability == second.failure_probability
    assert first.risk_level == second.risk_level
    assert first.model_version == second.model_version
    assert first.model_name == second.model_name


def test_missing_and_invalid_features_are_rejected() -> None:
    with pytest.raises(ValidationError):
        PredictionRequest(**{key: value for key, value in VALID_FEATURES.items() if key != "cpu_usage"})

    with pytest.raises(FeatureValidationError, match="Missing required features"):
        prepare_features({key: value for key, value in VALID_FEATURES.items() if key != "cpu_usage"})

    invalid_features = {**VALID_FEATURES, "cpu_usage": 101}
    with pytest.raises(ValidationError):
        PredictionRequest(**invalid_features)
    with pytest.raises(FeatureValidationError, match="between 0 and 100"):
        prepare_features(invalid_features)


@pytest.mark.parametrize(
    ("probability", "expected"),
    [
        (0.0, "low"),
        (0.2499, "low"),
        (0.25, "moderate"),
        (0.5, "high"),
        (0.75, "critical"),
        (1.0, "critical"),
    ],
)
def test_risk_classification(probability: float, expected: str) -> None:
    assert classify_risk(probability) == expected


def test_risk_classification_rejects_out_of_range_probability() -> None:
    with pytest.raises(ValueError, match="between 0 and 1"):
        classify_risk(1.01)


def test_missing_model_artifact_fails_clearly(tmp_path: Path) -> None:
    missing_path = tmp_path / "missing.joblib"

    with pytest.raises(ModelArtifactError, match="does not exist"):
        load_model_bundle(missing_path)


def test_invalid_model_artifact_fails_clearly(tmp_path: Path) -> None:
    artifact_path = tmp_path / "model.joblib"
    artifact_path.write_bytes(b"not a joblib model")
    metadata = {
        "input_features": list(loader.EXPECTED_INPUT_FEATURES),
        "model_version": "test",
        "model_name": "test",
        "scikit_learn_version": version("scikit-learn"),
    }
    artifact_path.with_name("metadata.json").write_text(json.dumps(metadata), encoding="utf-8")

    with pytest.raises(ModelArtifactError, match="Could not load inference model"):
        load_model_bundle(artifact_path)