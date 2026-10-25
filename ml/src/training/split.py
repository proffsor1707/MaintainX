from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

from src.data.schema import RAW_FEATURE_COLUMNS, TARGET_COLUMN
from src.training.config import TrainingConfig


@dataclass(frozen=True)
class DatasetSplit:
    X_train: pd.DataFrame
    X_validation: pd.DataFrame
    X_test: pd.DataFrame
    y_train: pd.Series
    y_validation: pd.Series
    y_test: pd.Series


def split_dataset(dataset: pd.DataFrame, config: TrainingConfig) -> DatasetSplit:
    X = dataset.loc[:, RAW_FEATURE_COLUMNS].reset_index(drop=True)
    y = dataset[TARGET_COLUMN].astype("int64").reset_index(drop=True)
    class_counts = y.value_counts()
    if len(class_counts) != 2 or class_counts.min() < 3:
        raise ValueError("At least three rows from each target class are required for stratified splitting.")

    indices = np.arange(len(dataset))
    train_validation_indices, test_indices = train_test_split(
        indices,
        test_size=config.test_fraction,
        random_state=config.random_state,
        stratify=y,
    )
    validation_relative_fraction = config.validation_fraction / (1 - config.test_fraction)
    train_indices, validation_indices = train_test_split(
        train_validation_indices,
        test_size=validation_relative_fraction,
        random_state=config.random_state,
        stratify=y.iloc[train_validation_indices],
    )

    return DatasetSplit(
        X_train=X.iloc[train_indices].reset_index(drop=True),
        X_validation=X.iloc[validation_indices].reset_index(drop=True),
        X_test=X.iloc[test_indices].reset_index(drop=True),
        y_train=y.iloc[train_indices].reset_index(drop=True),
        y_validation=y.iloc[validation_indices].reset_index(drop=True),
        y_test=y.iloc[test_indices].reset_index(drop=True),
    )