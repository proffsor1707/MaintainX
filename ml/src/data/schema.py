from typing import Final

TARGET_COLUMN: Final = "failure_within_24h"
RAW_FEATURE_COLUMNS: Final = (
    "cpu_usage",
    "memory_usage",
    "response_time_ms",
    "error_rate",
    "request_volume",
    "historical_incidents_30d",
)
REQUIRED_COLUMNS: Final = (*RAW_FEATURE_COLUMNS, TARGET_COLUMN)

PERCENT_COLUMNS: Final = ("cpu_usage", "memory_usage")
NON_NEGATIVE_COLUMNS: Final = (
    "response_time_ms",
    "request_volume",
    "historical_incidents_30d",
)


class DatasetValidationError(ValueError):
    """Raised when a CSV does not satisfy the training dataset contract."""