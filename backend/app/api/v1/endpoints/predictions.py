import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.database.session import get_optional_db_session
from app.ml.loader import ModelArtifactError
from app.ml.predictor import predict_failure
from app.ml.preprocessing import FeatureValidationError
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.predictions import persist_prediction

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=PredictionResponse, status_code=200)
def create_prediction(
	request: PredictionRequest,
	session: Session | None = Depends(get_optional_db_session),
) -> PredictionResponse:
	features = request.model_dump(exclude={"system_id"})

	try:
		prediction = predict_failure(features)
		if request.system_id is not None:
			if session is None:
				raise AppException(
					"Database is required to associate a prediction with a system.",
					code="database_unavailable",
					status_code=503,
				)
			persist_prediction(session, request.system_id, prediction)
	except AppException:
		raise
	except ModelArtifactError as error:
		raise AppException(
			"Prediction model is unavailable.",
			code="model_unavailable",
			status_code=503,
		) from error
	except FeatureValidationError as error:
		raise AppException(
			str(error),
			code="invalid_prediction_input",
			status_code=422,
		) from error
	except Exception as error:
		logger.error("Prediction inference failed", extra={"exception_type": type(error).__name__})
		raise AppException(
			"Prediction inference failed.",
			code="inference_failed",
			status_code=500,
		) from error

	return prediction.model_copy(update={"system_id": request.system_id})