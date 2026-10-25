from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db_session
from app.schemas.incidents import IncidentCreate, IncidentResponse, IncidentSeverity, IncidentStatus, IncidentUpdate
from app.services.incidents import create_incident, get_incident, list_incidents, update_incident

router = APIRouter()


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident_endpoint(
	payload: IncidentCreate,
	session: Session = Depends(get_db_session),
) -> IncidentResponse:
	return create_incident(session, payload)


@router.get("", response_model=list[IncidentResponse])
def list_incidents_endpoint(
	system_id: UUID | None = None,
	severity: IncidentSeverity | None = None,
	incident_status: IncidentStatus | None = Query(default=None, alias="status"),
	limit: int = Query(default=100, ge=1, le=500),
	offset: int = Query(default=0, ge=0),
	session: Session = Depends(get_db_session),
) -> list[IncidentResponse]:
	return list_incidents(
		session,
		system_id=system_id,
		severity=severity,
		status=incident_status,
		limit=limit,
		offset=offset,
	)


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_endpoint(
	incident_id: UUID,
	session: Session = Depends(get_db_session),
) -> IncidentResponse:
	return get_incident(session, incident_id)


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident_endpoint(
	incident_id: UUID,
	payload: IncidentUpdate,
	session: Session = Depends(get_db_session),
) -> IncidentResponse:
	return update_incident(session, incident_id, payload)