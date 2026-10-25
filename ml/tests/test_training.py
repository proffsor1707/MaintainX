import json

import joblib
import pandas as pd

from src.data.generate_sample import generate_synthetic_dataset
from src.data.load import validate_dataset
from src.training.config import TrainingConfig
from src.training.split import split_dataset
from src.training.train import train_and_export


def test_split_is_reproducible_and_disjoint() -> None:
    dataset = validate_dataset(generate_synthetic_dataset(rows=180, random_state=29))
    config = TrainingConfig(random_state=8)

    first = split_dataset(dataset, config)
    second = split_dataset(dataset, config)

    pd.testing.assert_frame_equal(first.X_train, second.X_train)
    assert len(first.X_train) + len(first.X_validation) + len(first.X_test) == len(dataset)
    assert first.y_train.nunique() == first.y_validation.nunique() == first.y_test.nunique() == 2


def test_training_exports_loadable_pipeline_and_metadata(tmp_path) -> None:
    dataset_path = tmp_path / "synthetic.csv"
    output_dir = tmp_path / "artifacts"
    generate_synthetic_dataset(rows=240, random_state=11).to_csv(dataset_path, index=False)

    result = train_and_export(
        dataset_path=dataset_path,
        output_dir=output_dir,
        config=TrainingConfig(random_state=7),
        dataset_source="synthetic",
    )

    pipeline = joblib.load(output_dir / "inference_pipeline.joblib")
    preprocessing_pipeline = joblib.load(output_dir / "preprocessing_pipeline.joblib")
    inputs = pd.read_csv(dataset_path).drop(columns="failure_within_24h").head(5)
    probabilities = pipeline.predict_proba(inputs)[:, 1]
    transformed = preprocessing_pipeline.transform(inputs)
    metadata = json.loads((output_dir / "metadata.json").read_text(encoding="utf-8"))
    metrics = result["evaluation_metrics"]

    assert probabilities.shape == (5,)
    assert ((probabilities >= 0) & (probabilities <= 1)).all()
    assert transformed.shape[0] == 5
    assert metadata["dataset_source"] == "synthetic"
    assert metadata["dataset_is_synthetic"] is True
    assert set(metrics) == {"validation", "test"}
    assert set(metrics["test"]) == {"accuracy", "precision", "recall", "f1", "roc_auc"}
    assert (output_dir / "failure_risk_model.joblib").is_file()
    assert (output_dir / "preprocessing_pipeline.joblib").is_file()