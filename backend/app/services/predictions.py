from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.prediction import Prediction
from app.repositories.predictions import PredictionRepository
from app.repositories.systems import SystemRepository
from app.schemas.prediction import PredictionResponse


def persist_prediction(
    session: Session,
    system_id: UUID,
    result: PredictionResponse,
) -> Prediction:
    if SystemRepository(session).get(system_id) is None:
        raise AppException("System not found.", code="system_not_found", status_code=404)

    severity = "medium" if result.risk_level == "moderate" else result.risk_level
    prediction = Prediction(
        system_id=system_id,
        prediction_type="failure-risk",
        score=result.failure_probability,
        severity=severity,
        details={
            "risk_level": result.risk_level,
            "model_name": result.model_name,
            "model_version": result.model_version,
            "dataset_is_synthetic": result.dataset_is_synthetic,
        },
        generated_at=result.generated_at,
    )
    PredictionRepository(session).add(prediction)
    session.commit()
    return prediction