from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


IncidentSeverity = Literal["critical", "high", "medium", "low"]
IncidentStatus = Literal["open", "investigating", "resolved"]


class IncidentCreate(BaseModel):
    system_id: UUID
    title: str = Field(min_length=1, max_length=240)
    description: str | None = None
    severity: IncidentSeverity
    status: IncidentStatus = "open"
    occurred_at: datetime | None = None


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=240)
    description: str | None = None
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None

    @model_validator(mode="after")
    def require_update_fields(self) -> "IncidentUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one incident field must be provided.")
        return self


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    system_id: UUID
    title: str
    description: str | None
    severity: IncidentSeverity
    status: IncidentStatus
    occurred_at: datetime
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime