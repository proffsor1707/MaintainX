from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score


def evaluate_classifier(model: Any, X: pd.DataFrame, y: pd.Series) -> dict[str, float | None]:
    predicted = model.predict(X)
    probabilities = model.predict_proba(X)[:, 1]
    roc_auc = float(roc_auc_score(y, probabilities)) if y.nunique() == 2 else None
    return {
        "accuracy": float(accuracy_score(y, predicted)),
        "precision": float(precision_score(y, predicted, zero_division=0)),
        "recall": float(recall_score(y, predicted, zero_division=0)),
        "f1": float(f1_score(y, predicted, zero_division=0)),
        "roc_auc": roc_auc,
    }