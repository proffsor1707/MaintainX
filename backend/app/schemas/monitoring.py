from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


MetricKind = Literal["cpu_usage", "memory_usage", "response_time_ms", "error_rate", "request_volume"]


class MetricCreate(BaseModel):
    name: MetricKind
    value: float = Field(allow_inf_nan=False)
    unit: str | None = Field(default=None, max_length=40)
    recorded_at: datetime | None = None

    @model_validator(mode="after")
    def validate_value_range(self) -> "MetricCreate":
        if self.name in {"cpu_usage", "memory_usage"} and not 0 <= self.value <= 100:
            raise ValueError(f"{self.name} must be between 0 and 100.")
        if self.name == "error_rate" and not 0 <= self.value <= 1:
            raise ValueError("error_rate must be between 0 and 1.")
        if self.name in {"response_time_ms", "request_volume"} and self.value < 0:
            raise ValueError(f"{self.name} must be non-negative.")
        return self


class MetricResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    system_id: UUID
    name: MetricKind
    value: float
    unit: str | None
    recorded_at: datetime
    created_at: datetime