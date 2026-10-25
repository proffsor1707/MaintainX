from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SystemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None
    status: Literal["healthy", "watch", "offline"]
    created_at: datetime
    updated_at: datetime


class MetricRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    system_id: UUID
    name: str
    value: float
    unit: str | None
    recorded_at: datetime
    created_at: datetime


class IncidentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    system_id: UUID
    title: str
    description: str | None
    severity: Literal["critical", "high", "medium", "low"]
    status: Literal["open", "investigating", "resolved"]
    occurred_at: datetime
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    system_id: UUID
    prediction_type: str
    score: float = Field(ge=0, le=1)
    severity: Literal["critical", "high", "medium", "low"]
    details: dict[str, Any] | None
    generated_at: datetime
    created_at: datetime
    updated_at: datetime