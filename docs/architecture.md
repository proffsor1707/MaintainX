# Architecture

## Runtime path

1. The React 19/Vite SPA in `frontend/` renders the dashboard and uses Clerk for browser sign-in.
2. `frontend/src/services/api/client.ts` centralizes fetch, base URL handling, bearer-token attachment, and HTTP/network/JSON errors. Hooks orchestrate requests; components do not build API URLs.
3. FastAPI in `backend/app/` exposes `/api/v1`. The v1 health route is public; business routers require a Clerk bearer JWT verified against configured JWKS and issuer values.
4. API handlers validate Pydantic contracts and delegate to services. Services use SQLAlchemy repositories; PostgreSQL schema changes are managed by Alembic.
5. The backend inference service lazily loads the trusted exported ML pipeline once per process. It does not train a model.
6. Training, evaluation, and export remain isolated under `ml/`.

## Data boundaries

- Systems, metrics, incidents, and stored predictions use the existing SQLAlchemy models.
- Recommendations are deterministic rules over the latest persisted prediction; there is no external AI service.
- Dashboard endpoints are connected where backend capabilities exist. The existing module-risk table and forecast remain explicitly sample/demo content because there is no corresponding backend data source.
- No user/system ownership relationship exists in the database yet. JWT authentication verifies identity, but per-user row-level authorization is not implemented.

## Deployment topology

Compose runs `frontend` (Nginx static SPA and same-origin API proxy), `backend` (FastAPI), and `postgres`. The API is private to the Compose network; Nginx proxies `/api/` to `backend:8000`. PostgreSQL uses a persistent named volume and is not published to the host by default.
