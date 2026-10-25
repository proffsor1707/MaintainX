import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from src.data.load import load_dataset
from src.data.schema import RAW_FEATURE_COLUMNS, TARGET_COLUMN
from src.evaluation.metrics import evaluate_classifier
from src.export import export_artifacts
from src.features.pipeline import build_feature_pipeline
from src.training.config import TrainingConfig, load_training_config
from src.training.split import split_dataset

MODEL_VERSION = "1.0.0"
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def build_classifier_pipeline(config: TrainingConfig) -> Pipeline:
    feature_pipeline = build_feature_pipeline()
    return Pipeline(
        steps=[
            ("feature_engineering", feature_pipeline.named_steps["feature_engineering"]),
            ("preprocessing", feature_pipeline.named_steps["preprocessing"]),
            (
                "classifier",
                LogisticRegression(
                    max_iter=config.logistic_regression_max_iter,
                    C=config.logistic_regression_c,
                    class_weight="balanced",
                    random_state=config.random_state,
                ),
            ),
        ]
    )


def train_and_export(
    *,
    dataset_path: str | Path,
    output_dir: str | Path,
    config: TrainingConfig,
    dataset_source: str,
) -> dict[str, object]:
    dataset = load_dataset(dataset_path)
    split = split_dataset(dataset, config)

    model = build_classifier_pipeline(config)
    model.fit(split.X_train, split.y_train)

    evaluation_metrics = {
        "validation": evaluate_classifier(model, split.X_validation, split.y_validation),
        "test": evaluate_classifier(model, split.X_test, split.y_test),
    }
    metadata = {
        "model_name": "software_failure_risk_logistic_regression",
        "model_version": MODEL_VERSION,
        "model_type": "LogisticRegression",
        "trained_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_name": Path(dataset_path).name,
        "dataset_source": dataset_source,
        "dataset_is_synthetic": dataset_source == "synthetic",
        "row_count": int(len(dataset)),
        "target_column": TARGET_COLUMN,
        "input_features": list(RAW_FEATURE_COLUMNS),
        "derived_features": ["resource_pressure", "cpu_memory_pressure", "response_error_interaction", "prior_incident_indicator"],
        "split": {
            "train_rows": int(len(split.X_train)),
            "validation_rows": int(len(split.X_validation)),
            "test_rows": int(len(split.X_test)),
            "random_state": config.random_state,
        },
        "scikit_learn_version": sklearn.__version__,
    }
    export_artifacts(
        model=model,
        metadata=metadata,
        evaluation_metrics=evaluation_metrics,
        output_dir=output_dir,
    )
    return {"metadata": metadata, "evaluation_metrics": evaluation_metrics}


def main() -> None:
    parser = argparse.ArgumentParser(description="Train and evaluate a failure-risk baseline classifier.")
    parser.add_argument("--dataset", type=Path, default=PROJECT_ROOT / "datasets" / "synthetic_failure_risk.csv")
    parser.add_argument("--output-dir", type=Path, default=PROJECT_ROOT / "models")
    parser.add_argument("--config", type=Path, default=PROJECT_ROOT / "configs" / "training.json")
    parser.add_argument("--dataset-source", default="unspecified", choices=("real", "synthetic", "unspecified"))
    args = parser.parse_args()

    config = load_training_config(args.config)
    result = train_and_export(
        dataset_path=args.dataset,
        output_dir=args.output_dir,
        config=config,
        dataset_source=args.dataset_source,
    )
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()