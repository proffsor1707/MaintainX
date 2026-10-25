from pathlib import Path

import pandas as pd

from src.data.schema import (
    NON_NEGATIVE_COLUMNS,
    PERCENT_COLUMNS,
    REQUIRED_COLUMNS,
    TARGET_COLUMN,
    DatasetValidationError,
)


def validate_dataset(dataset: pd.DataFrame) -> pd.DataFrame:
    missing_columns = sorted(set(REQUIRED_COLUMNS) - set(dataset.columns))
    if missing_columns:
        raise DatasetValidationError(f"Dataset is missing required columns: {missing_columns}")
    if dataset.empty:
        raise DatasetValidationError("Dataset must contain at least one row.")

    validated = dataset.loc[:, REQUIRED_COLUMNS].copy()
    for column in (*REQUIRED_COLUMNS[:-1], TARGET_COLUMN):
        original = validated[column]
        numeric = pd.to_numeric(original, errors="coerce")
        invalid = original.notna() & numeric.isna()
        if invalid.any():
            raise DatasetValidationError(f"Column '{column}' contains non-numeric values.")
        validated[column] = numeric

    if validated[TARGET_COLUMN].isna().any():
        raise DatasetValidationError(f"Target '{TARGET_COLUMN}' cannot be missing.")
    target_values = set(validated[TARGET_COLUMN].unique())
    if not target_values.issubset({0, 1}):
        raise DatasetValidationError(f"Target '{TARGET_COLUMN}' must contain only 0 or 1.")

    for column in PERCENT_COLUMNS:
        values = validated[column].dropna()
        if ((values < 0) | (values > 100)).any():
            raise DatasetValidationError(f"Column '{column}' must be between 0 and 100.")

    if ((validated["error_rate"].dropna() < 0) | (validated["error_rate"].dropna() > 1)).any():
        raise DatasetValidationError("Column 'error_rate' must be between 0 and 1.")

    for column in NON_NEGATIVE_COLUMNS:
        if (validated[column].dropna() < 0).any():
            raise DatasetValidationError(f"Column '{column}' must be non-negative.")

    return validated.reset_index(drop=True)


def load_dataset(path: str | Path) -> pd.DataFrame:
    dataset_path = Path(path)
    if not dataset_path.is_file():
        raise FileNotFoundError(f"Dataset file does not exist: {dataset_path}")
    try:
        dataset = pd.read_csv(dataset_path)
    except (OSError, UnicodeDecodeError, pd.errors.ParserError) as error:
        raise DatasetValidationError(f"Could not read CSV dataset: {dataset_path}") from error
    return validate_dataset(dataset)