import uuid

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.models import Incident, Metric, Prediction, System
from app.repositories.incidents import IncidentRepository
from app.repositories.metrics import MetricRepository
from app.repositories.predictions import PredictionRepository
from app.repositories.systems import SystemRepository


@pytest.fixture
def session() -> Session:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_sqlite_foreign_keys(connection, _record) -> None:
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as db_session:
        yield db_session
    Base.metadata.drop_all(engine)
    engine.dispose()


def test_repositories_create_related_records(session: Session) -> None:
    system = System(name="Test system", slug="test-system")
    SystemRepository(session).add(system)
    session.commit()

    metric = Metric(system_id=system.id, name="temperature", value=21.5, unit="C")
    incident = Incident(system_id=system.id, title="High temperature", severity="high")
    prediction = Prediction(
        system_id=system.id,
        prediction_type="maintenance-risk",
        score=0.6,
        severity="medium",
    )

    MetricRepository(session).add(metric)
    IncidentRepository(session).add(incident)
    PredictionRepository(session).add(prediction)
    session.commit()

    assert SystemRepository(session).get(system.id) is system
    assert MetricRepository(session).list_for_system(system.id) == [metric]
    assert IncidentRepository(session).list_for_system(system.id) == [incident]
    assert PredictionRepository(session).list_for_system(system.id) == [prediction]


def test_system_delete_cascades_to_related_records(session: Session) -> None:
    system = System(name="Cascade system", slug="cascade-system")
    SystemRepository(session).add(system)
    session.add(Metric(system_id=system.id, name="load", value=0.25))
    session.commit()

    session.delete(system)
    session.commit()

    assert session.query(Metric).count() == 0


def test_prediction_score_constraint_is_enforced(session: Session) -> None:
    system = System(name="Constraint system", slug="constraint-system")
    SystemRepository(session).add(system)
    session.commit()

    session.add(
        Prediction(
            system_id=system.id,
            prediction_type="risk",
            score=1.5,
            severity="high",
        )
    )

    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()