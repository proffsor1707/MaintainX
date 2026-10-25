import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system import System


class SystemRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get(self, system_id: uuid.UUID) -> System | None:
        return self.session.get(System, system_id)

    def list(self, *, limit: int = 100, offset: int = 0) -> list[System]:
        statement = select(System).order_by(System.name).offset(offset).limit(limit)
        return list(self.session.scalars(statement))

    def get_by_slug(self, slug: str) -> System | None:
        return self.session.scalar(select(System).where(System.slug == slug))

    def add(self, system: System) -> System:
        self.session.add(system)
        self.session.flush()
        return system