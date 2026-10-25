import json
import sys
from dataclasses import dataclass
from functools import lru_cache
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path
from typing import Any

import joblib

from app.core.config import get_settings

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
ML_PACKAGE_ROOT = REPOSITORY_ROOT / "ml"
EXPECTED_INPUT_FEATURES = (
    "cpu_usage",
    "memory_usage",
    "response_time_ms",
    "error_rate",
    "request_volume",
    "historical_incidents_30d",
)


class ModelArtifactError(RuntimeError):
    """Raised when the configured inference artifact cannot be safely used."""


@dataclass(frozen=True)
class ModelBundle:
    pipeline: Any
    metadata: dict[str, Any]
    artifact_path: Path


def resolve_model_path(path: str | Path | None = None) -> Path:
    configured_value = path if path is not None else get_settings().model_artifact_path.strip()
    if not configured_value:
        configured_value = "ml/models/inference_pipeline.joblib"
    configured_path = Path(configured_value).expanduser()
    if not configured_path.is_absolute():
        configured_path = REPOSITORY_ROOT / configured_path
    return configured_path.resolve()


def load_model_bundle(path: str | Path | None = None) -> ModelBundle:
    """Load a trusted, locally supplied joblib artifact and validate its contract.

    Joblib uses pickle serialization; never point MODEL_ARTIFACT_PATH at an
    artifact from an untrusted source.
    """
    artifact_path = resolve_model_path(path)
    if not artifact_path.is_file():
        raise ModelArtifactError(f"Inference model artifact does not exist: {artifact_path}")

    metadata_path = artifact_path.with_name("metadata.json")
    if not metadata_path.is_file():
        raise ModelArtifactError(f"Model metadata file does not exist: {metadata_path}")

    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ModelArtifactError(f"Could not read model metadata: {metadata_path}") from error

    if metadata.get("input_features") != list(EXPECTED_INPUT_FEATURES):
        raise ModelArtifactError("Model metadata does not match the supported input feature contract.")
    if not metadata.get("model_version") or not metadata.get("model_name"):
        raise ModelArtifactError("Model metadata must include model_name and model_version.")
    try:
        installed_sklearn_version = version("scikit-learn")
    except PackageNotFoundError as error:
        raise ModelArtifactError("scikit-learn is required to load the inference model.") from error
    artifact_sklearn_version = metadata.get("scikit_learn_version")
    if artifact_sklearn_version != installed_sklearn_version:
        raise ModelArtifactError(
            "scikit-learn version mismatch: "
            f"artifact requires {artifact_sklearn_version}, installed {installed_sklearn_version}."
        )

    try:
        ml_package_root = str(ML_PACKAGE_ROOT)
        if ml_package_root not in sys.path:
            sys.path.insert(0, ml_package_root)
        pipeline = joblib.load(artifact_path)
    except Exception as error:
        raise ModelArtifactError(f"Could not load inference model artifact: {artifact_path}") from error

    if not callable(getattr(pipeline, "predict_proba", None)):
        raise ModelArtifactError("Inference artifact must expose predict_proba().")
    classes = getattr(pipeline, "classes_", None)
    if classes is None or 0 not in classes or 1 not in classes:
        raise ModelArtifactError("Inference artifact must be a fitted binary classifier with classes 0 and 1.")

    return ModelBundle(pipeline=pipeline, metadata=metadata, artifact_path=artifact_path)


@lru_cache(maxsize=1)
def get_model_bundle() -> ModelBundle:
    """Load the trusted model and its metadata once per process."""
    return load_model_bundle()