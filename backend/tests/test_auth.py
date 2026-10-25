from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.api.auth import require_authenticated_user
from app.main import app


@pytest.fixture
def unauthenticated_client() -> Iterator[TestClient]:
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides.pop(require_authenticated_user, None)
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def test_business_routes_require_bearer_authentication(unauthenticated_client: TestClient) -> None:
    response = unauthenticated_client.get("/api/v1/systems")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_health_remains_public(unauthenticated_client: TestClient) -> None:
    response = unauthenticated_client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}