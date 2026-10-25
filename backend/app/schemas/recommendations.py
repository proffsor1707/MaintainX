from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.incidents import IncidentSeverity


class RecommendationItem(BaseModel):
    code: str
    message: str


class RecommendationsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    system_id: UUID
    prediction_id: UUID
    failure_probability: float = Field(ge=0, le=1)
    severity: IncidentSeverity
    risk_level: Literal["low", "moderate", "high", "critical"]
    generated_at: datetime
    recommendations: list[RecommendationItem]