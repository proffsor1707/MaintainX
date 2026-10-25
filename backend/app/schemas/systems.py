from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


SystemStatus = Literal["healthy", "watch", "offline"]


class SystemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=180, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str | None = None


class SystemStatusUpdate(BaseModel):
    status: SystemStatus


class SystemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    description: str | None
    status: SystemStatus
    created_at: datetime
    updated_at: datetime