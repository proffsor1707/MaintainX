from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db_session
from app.schemas.systems import SystemCreate, SystemResponse, SystemStatusUpdate
from app.services.systems import create_system, get_system, list_systems, update_system_status

router = APIRouter()


@router.post("", response_model=SystemResponse, status_code=status.HTTP_201_CREATED)
def create_system_endpoint(
	payload: SystemCreate,
	session: Session = Depends(get_db_session),
) -> SystemResponse:
	return create_system(session, payload)


@router.get("", response_model=list[SystemResponse])
def list_systems_endpoint(
	limit: int = Query(default=100, ge=1, le=500),
	offset: int = Query(default=0, ge=0),
	session: Session = Depends(get_db_session),
) -> list[SystemResponse]:
	return list_systems(session, limit=limit, offset=offset)


@router.get("/{system_id}", response_model=SystemResponse)
def get_system_endpoint(
	system_id: UUID,
	session: Session = Depends(get_db_session),
) -> SystemResponse:
	return get_system(session, system_id)


@router.patch("/{system_id}/status", response_model=SystemResponse)
def update_system_status_endpoint(
	system_id: UUID,
	payload: SystemStatusUpdate,
	session: Session = Depends(get_db_session),
) -> SystemResponse:
	return update_system_status(session, system_id, payload.status)