from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]


class ErrorResponse(BaseModel):
    code: str
    message: str