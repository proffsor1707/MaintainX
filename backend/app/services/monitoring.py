from uuid import UUID

from sqlalchemy.orm import Session

from app.models.metric import Metric
from app.repositories.metrics import MetricRepository
from app.schemas.monitoring import MetricCreate, MetricKind
from app.services.systems import get_system


def record_metric(session: Session, system_id: UUID, payload: MetricCreate) -> Metric:
    get_system(session, system_id)
    values = payload.model_dump(exclude={"recorded_at"})
    metric = Metric(
        system_id=system_id,
        **values,
        **({"recorded_at": payload.recorded_at} if payload.recorded_at is not None else {}),
    )
    MetricRepository(session).add(metric)
    session.commit()
    session.refresh(metric)
    return metric


def list_system_metrics(
    session: Session,
    system_id: UUID,
    *,
    name: MetricKind | None,
    limit: int,
    offset: int,
) -> list[Metric]:
    get_system(session, system_id)
    return MetricRepository(session).list_for_system(system_id, name=name, limit=limit, offset=offset)