# ML pipeline

Training and evaluation live under `ml/`; the backend imports only the Phase 8 transformer source needed to unpickle the exported inference pipeline. It never imports training commands or retrains during application startup.

The baseline Logistic Regression expects CPU usage, memory usage, response time, error rate, request volume, and historical incident count. The pipeline derives resource/interaction/incident-indicator features and applies median imputation and scaling before inference.

The current artifact metadata identifies version `1.0.0` and `dataset_is_synthetic: true`. It was trained and evaluated on a deterministic 360-row synthetic fixture. Its validation/test metrics are development checks only and must not be interpreted as production performance. Replace the dataset and retrain under a separately reviewed process before operational use.

The model, preprocessing, inference, metadata, and metric artifacts are git-ignored. Provide a trusted model artifact and adjacent metadata at `MODEL_ARTIFACT_PATH`. Joblib uses pickle serialization and must never load artifacts from untrusted sources. The backend checks feature names and scikit-learn version before loading.
