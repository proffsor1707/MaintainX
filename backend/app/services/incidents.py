from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.models.incident import Incident
from app.repositories.incidents import IncidentRepository
from app.schemas.incidents import IncidentCreate, IncidentSeverity, IncidentStatus, IncidentUpdate
from app.services.systems import get_system


def create_incident(session: Session, payload: IncidentCreate) -> Incident:
    get_system(session, payload.system_id)
    values = payload.model_dump(exclude={"occurred_at"})
    incident = Incident(
        **values,
        **({"occurred_at": payload.occurred_at} if payload.occurred_at is not None else {}),
        resolved_at=datetime.now(timezone.utc) if payload.status == "resolved" else None,
    )
    IncidentRepository(session).add(incident)
    session.commit()
    session.refresh(incident)
    return incident


def get_incident(session: Session, incident_id: UUID) -> Incident:
    incident = IncidentRepository(session).get(incident_id)
    if incident is None:
        raise AppException("Incident not found.", code="incident_not_found", status_code=404)
    return incident


def list_incidents(
    session: Session,
    *,
    system_id: UUID | None,
    severity: IncidentSeverity | None,
    status: IncidentStatus | None,
    limit: int,
    offset: int,
) -> list[Incident]:
    if system_id is not None:
        get_system(session, system_id)
    return IncidentRepository(session).list(
        system_id=system_id,
        severity=severity,
        status=status,
        limit=limit,
        offset=offset,
    )


def update_incident(session: Session, incident_id: UUID, payload: IncidentUpdate) -> Incident:
    incident = get_incident(session, incident_id)
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(incident, field, value)
    if changes.get("status") == "resolved" and incident.resolved_at is None:
        incident.resolved_at = datetime.now(timezone.utc)
    elif changes.get("status") in {"open", "investigating"}:
        incident.resolved_at = None
    session.commit()
    session.refresh(incident)
    return incident