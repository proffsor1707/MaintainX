from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db_session
from app.schemas.monitoring import MetricCreate, MetricKind, MetricResponse
from app.services.monitoring import list_system_metrics, record_metric

router = APIRouter()


@router.post("/systems/{system_id}/metrics", response_model=MetricResponse, status_code=status.HTTP_201_CREATED)
def create_metric_endpoint(
	system_id: UUID,
	payload: MetricCreate,
	session: Session = Depends(get_db_session),
) -> MetricResponse:
	return record_metric(session, system_id, payload)


@router.get("/systems/{system_id}/metrics", response_model=list[MetricResponse])
def list_metrics_endpoint(
	system_id: UUID,
	name: MetricKind | None = None,
	limit: int = Query(default=100, ge=1, le=500),
	offset: int = Query(default=0, ge=0),
	session: Session = Depends(get_db_session),
) -> list[MetricResponse]:
	return list_system_metrics(session, system_id, name=name, limit=limit, offset=offset)