from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db_session
from app.schemas.recommendations import RecommendationsResponse
from app.services.recommendations import get_recommendations

router = APIRouter()


@router.get("/{system_id}", response_model=RecommendationsResponse)
def get_recommendations_endpoint(
    system_id: UUID,
    session: Session = Depends(get_db_session),
) -> RecommendationsResponse:
    return get_recommendations(session, system_id)