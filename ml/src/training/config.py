import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class TrainingConfig:
    random_state: int = 42
    test_fraction: float = 0.2
    validation_fraction: float = 0.2
    logistic_regression_max_iter: int = 1000
    logistic_regression_c: float = 1.0

    def __post_init__(self) -> None:
        if not 0 < self.test_fraction < 1:
            raise ValueError("test_fraction must be between 0 and 1.")
        if not 0 < self.validation_fraction < 1:
            raise ValueError("validation_fraction must be between 0 and 1.")
        if self.test_fraction + self.validation_fraction >= 1:
            raise ValueError("test_fraction + validation_fraction must be less than 1.")
        if self.logistic_regression_max_iter < 1 or self.logistic_regression_c <= 0:
            raise ValueError("Logistic Regression settings must be positive.")


def load_training_config(path: str | Path) -> TrainingConfig:
    config_path = Path(path)
    with config_path.open(encoding="utf-8") as config_file:
        payload = json.load(config_file)
    return TrainingConfig(**payload)