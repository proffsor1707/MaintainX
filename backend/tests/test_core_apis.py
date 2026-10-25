from collections.abc import Iterator
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import AuthenticatedUser, require_authenticated_user
from app.database.base import Base
from app.database.session import get_db_session, get_optional_db_session
from app.main import app
from app.models.prediction import Prediction

MODEL_ARTIFACT_PATH = Path(__file__).resolve().parents[2] / "ml" / "models" / "inference_pipeline.joblib"


@pytest.fixture
def api_context() -> Iterator[tuple[TestClient, sessionmaker[Session]]]:
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
    test_session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    def override_db_session() -> Iterator[Session]:
        with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = override_db_session
    app.dependency_overrides[get_optional_db_session] = override_db_session
    app.dependency_overrides[require_authenticated_user] = lambda: AuthenticatedUser(subject="test-user")
    try:
        with TestClient(app) as client:
            yield client, test_session_factory
    finally:
        app.dependency_overrides.pop(get_db_session, None)
        app.dependency_overrides.pop(get_optional_db_session, None)
        app.dependency_overrides.pop(require_authenticated_user, None)
        Base.metadata.drop_all(engine)
        engine.dispose()


def create_system(client: TestClient) -> dict:
    response = client.post(
        "/api/v1/systems",
        json={"name": "Checkout", "slug": "checkout", "description": "Checkout runtime"},
    )
    assert response.status_code == 201
    return response.json()


def test_system_create_list_get_and_status_update(api_context) -> None:
    client, _session_factory = api_context
    created = create_system(client)
    system_id = created["id"]

    listed = client.get("/api/v1/systems")
    fetched = client.get(f"/api/v1/systems/{system_id}")
    updated = client.patch(f"/api/v1/systems/{system_id}/status", json={"status": "watch"})

    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [system_id]
    assert fetched.json()["name"] == "Checkout"
    assert updated.status_code == 200
    assert updated.json()["status"] == "watch"


def test_metrics_record_cpu_memory_response_and_error_with_timestamps(api_context) -> None:
    client, _session_factory = api_context
    system_id = create_system(client)["id"]
    metrics = [
        {"name": "cpu_usage", "value": 75, "unit": "%", "recorded_at": "2026-10-06T10:00:00Z"},
        {"name": "memory_usage", "value": 64, "unit": "%"},
        {"name": "response_time_ms", "value": 124.5, "unit": "ms"},
        {"name": "error_rate", "value": 0.04, "unit": "ratio"},
    ]

    created = [
        client.post(f"/api/v1/monitoring/systems/{system_id}/metrics", json=metric)
        for metric in metrics
    ]
    listed = client.get(f"/api/v1/monitoring/systems/{system_id}/metrics?name=cpu_usage")

    assert all(response.status_code == 201 for response in created)
    assert all(response.json()["recorded_at"] for response in created)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["name"] == "cpu_usage"
    assert listed.json()[0]["recorded_at"].startswith("2026-10-06T10:00:00")


def test_metric_values_are_validated(api_context) -> None:
    client, _session_factory = api_context
    system_id = create_system(client)["id"]

    response = client.post(
        f"/api/v1/monitoring/systems/{system_id}/metrics",
        json={"name": "cpu_usage", "value": 101},
    )

    assert response.status_code == 422


def test_incident_create_list_get_and_update(api_context) -> None:
    client, _session_factory = api_context
    system_id = create_system(client)["id"]
    created = client.post(
        "/api/v1/incidents",
        json={
            "system_id": system_id,
            "title": "Elevated error rate",
            "severity": "high",
            "description": "Observed on checkout",
        },
    )
    assert created.status_code == 201
    incident_id = created.json()["id"]

    listed = client.get(f"/api/v1/incidents?system_id={system_id}&severity=high&status=open")
    fetched = client.get(f"/api/v1/incidents/{incident_id}")
    resolved = client.patch(f"/api/v1/incidents/{incident_id}", json={"status": "resolved"})

    assert listed.status_code == 200 and len(listed.json()) == 1
    assert fetched.json()["system_id"] == system_id
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"
    assert resolved.json()["resolved_at"] is not None


def test_incident_create_rejects_unknown_system(api_context) -> None:
    client, _session_factory = api_context

    response = client.post(
        "/api/v1/incidents",
        json={
            "system_id": str(UUID(int=99)),
            "title": "Unknown system incident",
            "severity": "low",
        },
    )

    assert response.status_code == 404


def test_recommendations_require_persisted_prediction_and_apply_rules(api_context) -> None:
    client, session_factory = api_context
    system_id = create_system(client)["id"]
    missing = client.get(f"/api/v1/recommendations/{system_id}")
    assert missing.status_code == 404

    with session_factory() as session:
        session.add(
            Prediction(
                system_id=UUID(system_id),
                prediction_type="failure-risk",
                score=0.82,
                severity="critical",
            )
        )
        session.commit()

    response = client.get(f"/api/v1/recommendations/{system_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["system_id"] == system_id
    assert payload["failure_probability"] == 0.82
    assert payload["risk_level"] == "critical"
    assert [item["code"] for item in payload["recommendations"]] == [
        "investigate_now",
        "review_recent_changes",
    ]


@pytest.mark.skipif(
    not MODEL_ARTIFACT_PATH.is_file(),
    reason="The exported model artifact is external/ignored and is not present in a clean checkout.",
)
def test_system_linked_prediction_is_persisted_for_recommendations(api_context) -> None:
    client, _session_factory = api_context
    system_id = create_system(client)["id"]
    prediction = client.post(
        "/api/v1/predictions",
        json={
            "cpu_usage": 67.0,
            "memory_usage": 72.0,
            "response_time_ms": 115.0,
            "error_rate": 0.025,
            "request_volume": 2400,
            "historical_incidents_30d": 1,
            "system_id": system_id,
        },
    )

    recommendations = client.get(f"/api/v1/recommendations/{system_id}")

    assert prediction.status_code == 200
    assert prediction.json()["system_id"] == system_id
    assert recommendations.status_code == 200
    assert recommendations.json()["prediction_id"]