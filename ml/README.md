# Failure-risk ML pipeline

This package trains a baseline binary classifier for software/system failure risk. It is separate from the frontend and FastAPI service; no API integration is included.

## Dataset format

Input is a CSV with one row per observation and these columns:

| Column | Meaning | Expected values |
| --- | --- | --- |
| `cpu_usage` | CPU utilization percentage | 0 to 100 |
| `memory_usage` | Memory utilization percentage | 0 to 100 |
| `response_time_ms` | Response time in milliseconds | non-negative |
| `error_rate` | Fraction of requests with errors | 0 to 1 |
| `request_volume` | Requests in the observation window | non-negative |
| `historical_incidents_30d` | Prior incidents in the last 30 days | non-negative count |
| `failure_within_24h` | Binary target indicating a failure in the next 24 hours | 0 or 1 |

Feature values may be missing; numeric features are median-imputed using training data only. Missing targets and invalid ranges are rejected. No real dataset was present when this pipeline was created. `datasets/synthetic_failure_risk.csv` is a small deterministic synthetic fixture for development and test validation only; metrics from it are not evidence of production performance.

## Features and preprocessing

The pipeline retains all six input signals and derives resource pressure, CPU-memory interaction, response-time/error interaction, and a prior-incident indicator. Numeric features are median-imputed and standardized. Data is split reproducibly and stratified into train, validation, and test sets. A Logistic Regression baseline is fitted only on the training split. Accuracy, precision, recall, F1, and ROC-AUC (when the evaluation split contains both classes) are reported for validation and test.

## Generate the synthetic fixture

From this directory:

```powershell
python -m src.data.generate_sample --output datasets/synthetic_failure_risk.csv
```

Generation is deterministic for a fixed seed and row count.

## Install and train

```powershell
python -m pip install -e ".[dev]"
python -m src.training.train --dataset datasets/synthetic_failure_risk.csv --dataset-source synthetic
```

Use `--config configs/training.json` to choose split ratios and Logistic Regression settings. The default command writes validation/test metrics and metadata to the output directory.

## Tests and evaluation

```powershell
pytest
```

Evaluation uses held-out validation and test partitions. The CLI prints the observed metrics; no target metric or accuracy claim is assumed. Always evaluate on an appropriately collected, representative real dataset before operational use.

## Model outputs

Training writes `failure_risk_model.joblib` (classifier), `preprocessing_pipeline.joblib`, `inference_pipeline.joblib` (feature engineering + preprocessing + classifier), `metadata.json`, and `evaluation_metrics.json` to `models/` by default. Generated model binaries and run metadata are git-ignored. The metadata records model version, training time, dataset source/name, feature/target names, split settings, and library versions.