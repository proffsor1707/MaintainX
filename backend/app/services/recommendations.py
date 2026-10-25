from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.prediction import Prediction
from app.repositories.predictions import PredictionRepository
from app.services.systems import get_system
from app.schemas.recommendations import RecommendationItem, RecommendationsResponse


def _risk_level(prediction: Prediction) -> str:
    if prediction.severity == "critical" or prediction.score >= 0.75:
        return "critical"
    if prediction.severity == "high" or prediction.score >= 0.5:
        return "high"
    if prediction.severity == "medium" or prediction.score >= 0.25:
        return "moderate"
    return "low"


def _recommendations_for(risk_level: str) -> list[RecommendationItem]:
    rules = {
        "critical": [
            RecommendationItem(code="investigate_now", message="Investigate the elevated failure risk immediately."),
            RecommendationItem(code="review_recent_changes", message="Review recent changes and related system metrics."),
        ],
        "high": [
            RecommendationItem(code="review_system", message="Review system health and recent incidents promptly."),
            RecommendationItem(code="increase_monitoring", message="Increase monitoring frequency while risk remains high."),
        ],
        "moderate": [
            RecommendationItem(code="inspect_trend", message="Inspect recent metric trends and schedule a maintenance review."),
        ],
        "low": [
            RecommendationItem(code="continue_monitoring", message="Continue routine monitoring."),
        ],
    }
    return rules[risk_level]


def get_recommendations(session: Session, system_id: UUID) -> RecommendationsResponse:
    get_system(session, system_id)
    prediction = PredictionRepository(session).latest_for_system(system_id)
    if prediction is None:
        raise AppException(
            "No stored prediction is available for this system.",
            code="prediction_not_found",
            status_code=404,
        )

    risk_level = _risk_level(prediction)
    return RecommendationsResponse(
        system_id=system_id,
        prediction_id=prediction.id,
        failure_probability=prediction.score,
        severity=prediction.severity,
        risk_level=risk_level,
        generated_at=prediction.generated_at,
        recommendations=_recommendations_for(risk_level),
    )