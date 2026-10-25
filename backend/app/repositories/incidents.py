import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.incident import Incident


class IncidentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_for_system(self, system_id: uuid.UUID, *, limit: int = 100) -> list[Incident]:
        statement = (
            select(Incident)
            .where(Incident.system_id == system_id)
            .order_by(Incident.created_at.desc())
            .limit(limit)
        )
        return list(self.session.scalars(statement))

    def get(self, incident_id: uuid.UUID) -> Incident | None:
        return self.session.get(Incident, incident_id)

    def list(
        self,
        *,
        system_id: uuid.UUID | None = None,
        severity: str | None = None,
        status: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Incident]:
        statement = select(Incident)
        if system_id is not None:
            statement = statement.where(Incident.system_id == system_id)
        if severity is not None:
            statement = statement.where(Incident.severity == severity)
        if status is not None:
            statement = statement.where(Incident.status == status)
        statement = statement.order_by(Incident.created_at.desc()).offset(offset).limit(limit)
        return list(self.session.scalars(statement))

    def add(self, incident: Incident) -> Incident:
        self.session.add(incident)
        self.session.flush()
        return incident