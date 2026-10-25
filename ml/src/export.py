import json
from pathlib import Path
from typing import Any

import joblib
from sklearn.pipeline import Pipeline


def export_artifacts(
    *,
    model: Any,
    metadata: dict[str, Any],
    evaluation_metrics: dict[str, Any],
    output_dir: str | Path,
) -> dict[str, Path]:
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)

    artifacts = {
        "model": directory / "failure_risk_model.joblib",
        "preprocessing_pipeline": directory / "preprocessing_pipeline.joblib",
        "inference_pipeline": directory / "inference_pipeline.joblib",
        "metadata": directory / "metadata.json",
        "evaluation_metrics": directory / "evaluation_metrics.json",
    }

    joblib.dump(model.named_steps["classifier"], artifacts["model"])
    joblib.dump(Pipeline(model.steps[:-1]), artifacts["preprocessing_pipeline"])
    joblib.dump(model, artifacts["inference_pipeline"])
    artifacts["metadata"].write_text(json.dumps(metadata, indent=2, sort_keys=True), encoding="utf-8")
    artifacts["evaluation_metrics"].write_text(
        json.dumps(evaluation_metrics, indent=2, sort_keys=True, allow_nan=False),
        encoding="utf-8",
    )
    return artifacts