from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    cpu_usage: float | None = Field(ge=0, le=100)
    memory_usage: float | None = Field(ge=0, le=100)
    response_time_ms: float | None = Field(ge=0)
    error_rate: float | None = Field(ge=0, le=1)
    request_volume: float | None = Field(ge=0)
    historical_incidents_30d: float | None = Field(ge=0)
    system_id: UUID | None = None


class PredictionResponse(BaseModel):
    failure_probability: float = Field(ge=0, le=1)
    risk_level: Literal["low", "moderate", "high", "critical"]
    model_version: str
    model_name: str
    dataset_is_synthetic: bool
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    system_id: UUID | None = None