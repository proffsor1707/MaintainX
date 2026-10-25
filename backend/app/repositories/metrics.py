import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.metric import Metric


class MetricRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_for_system(
        self,
        system_id: uuid.UUID,
        *,
        name: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Metric]:
        statement = select(Metric).where(Metric.system_id == system_id)
        if name is not None:
            statement = statement.where(Metric.name == name)
        statement = statement.order_by(Metric.recorded_at.desc()).offset(offset).limit(limit)
        return list(self.session.scalars(statement))

    def add(self, metric: Metric) -> Metric:
        self.session.add(metric)
        self.session.flush()
        return metric