from fastapi import APIRouter

from app.schemas.common import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    return HealthResponse(status="ok")