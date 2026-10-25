from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.system import System
from app.repositories.systems import SystemRepository
from app.schemas.systems import SystemCreate, SystemStatus


def create_system(session: Session, payload: SystemCreate) -> System:
    repository = SystemRepository(session)
    if repository.get_by_slug(payload.slug) is not None:
        raise AppException("A system with this slug already exists.", code="system_conflict", status_code=409)
    system = System(**payload.model_dump())
    repository.add(system)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise AppException("A system with this name or slug already exists.", code="system_conflict", status_code=409) from error
    session.refresh(system)
    return system


def get_system(session: Session, system_id: UUID) -> System:
    system = SystemRepository(session).get(system_id)
    if system is None:
        raise AppException("System not found.", code="system_not_found", status_code=404)
    return system


def list_systems(session: Session, *, limit: int, offset: int) -> list[System]:
    return SystemRepository(session).list(limit=limit, offset=offset)


def update_system_status(session: Session, system_id: UUID, status: SystemStatus) -> System:
    system = get_system(session, system_id)
    system.status = status
    session.commit()
    session.refresh(system)
    return system