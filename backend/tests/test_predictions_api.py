from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from app.api.auth import AuthenticatedUser, require_authenticated_user
from app.api.v1.endpoints import predictions as prediction_endpoint
from app.core.exceptions import AppException
from app.main import app
from app.ml.loader import ModelArtifactError

client = TestClient(app)
MODEL_ARTIFACT_PATH = Path(__file__).resolve().parents[2] / "ml" / "models" / "inference_pipeline.joblib"


@pytest.fixture(autouse=True)
def authenticated_test_user():
    app.dependency_overrides[require_authenticated_user] = lambda: AuthenticatedUser(subject="test-user")
    yield
    app.dependency_overrides.pop(require_authenticated_user, None)

VALID_REQUEST = {
    "cpu_usage": 67.0,
    "memory_usage": 72.0,
    "response_time_ms": 115.0,
    "error_rate": 0.025,
    "request_volume": 2400,
    "historical_incidents_30d": 1,
}


@pytest.mark.skipif(
    not MODEL_ARTIFACT_PATH.is_file(),
    reason="The exported model artifact is external/ignored and is not present in a clean checkout.",
)
def test_prediction_endpoint_returns_typed_prediction() -> None:
    response = client.post("/api/v1/predictions", json=VALID_REQUEST)

    assert response.status_code == 200
    payload = response.json()
    assert 0 <= payload["failure_probability"] <= 1
    assert payload["risk_level"] in {"low", "moderate", "high", "critical"}
    assert payload["model_version"] == "1.0.0"
    assert payload["model_name"] == "software_failure_risk_logistic_regression"
    assert payload["dataset_is_synthetic"] is True
    assert payload["generated_at"]
    assert payload["system_id"] is None


def test_prediction_endpoint_requires_all_six_features() -> None:
    request = {key: value for key, value in VALID_REQUEST.items() if key != "cpu_usage"}

    response = client.post("/api/v1/predictions", json=request)

    assert response.status_code == 422


def test_prediction_endpoint_rejects_invalid_feature_type() -> None:
    response = client.post(
        "/api/v1/predictions",
        json={**VALID_REQUEST, "cpu_usage": "high"},
    )

    assert response.status_code == 422


def test_prediction_endpoint_rejects_invalid_feature_range() -> None:
    response = client.post(
        "/api/v1/predictions",
        json={**VALID_REQUEST, "error_rate": 1.2},
    )

    assert response.status_code == 422


def test_prediction_endpoint_returns_503_when_model_is_unavailable(monkeypatch) -> None:
    def unavailable(_features):
        raise ModelArtifactError("internal artifact path")

    monkeypatch.setattr(prediction_endpoint, "predict_failure", unavailable)
    response = client.post("/api/v1/predictions", json=VALID_REQUEST)

    assert response.status_code == 503
    assert response.json() == {
        "code": "model_unavailable",
        "message": "Prediction model is unavailable.",
    }


def test_prediction_endpoint_returns_sanitized_500_on_unexpected_failure(monkeypatch) -> None:
    def fail_unexpectedly(_features):
        raise RuntimeError("private implementation detail")

    monkeypatch.setattr(prediction_endpoint, "predict_failure", fail_unexpectedly)
    response = client.post("/api/v1/predictions", json=VALID_REQUEST)

    assert response.status_code == 500
    assert response.json() == {
        "code": "inference_failed",
        "message": "Prediction inference failed.",
    }