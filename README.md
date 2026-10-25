# MaintainX maintenance dashboard

A React/Vite dashboard, FastAPI service, PostgreSQL persistence layer, and separate software failure-risk ML pipeline.

## Architecture

```text
Browser (React/Vite + Clerk)
  -> shared fetch services
  -> FastAPI (/api/v1) + Clerk JWT verification
  -> repositories / SQLAlchemy 2.x
  -> PostgreSQL
  -> exported ML inference pipeline (separate from training)
```

See [docs/architecture.md](docs/architecture.md) for components and known boundaries.

## Local setup

### Frontend

```powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend run typecheck
pnpm --dir frontend run dev
```

The SPA uses Clerk for sign-in and routes dashboard pages behind Clerk. If `VITE_API_BASE_URL` or authenticated API configuration is unavailable, the existing sample dashboard remains clearly labeled as demo data.

### Backend

```powershell
python -m pip install -r backend/requirements/dev.txt
cd backend
python -m alembic upgrade head
python -m uvicorn app.main:app --reload
```

Set `DATABASE_URL`, `CLERK_JWKS_URL`, `CLERK_ISSUER`, and `FRONTEND_ORIGINS` in a local environment before using protected database APIs. `/api/v1/health` remains public. Do not place secrets in source control.

### ML

The reproducible training code is isolated in `ml/`. The currently exported Logistic Regression artifact was trained on a small synthetic fixture and is not production-validated. Install and run it with the instructions in [ml/README.md](ml/README.md). Model artifacts are intentionally git-ignored; supply a trusted `inference_pipeline.joblib` and its adjacent `metadata.json` at the configured path for inference.

## Docker Compose

Copy `.env.example` to a private `.env`, replace blank credential/configuration values, and make sure `DATABASE_URL` uses `postgres` as the Compose hostname. Provide the exported model and metadata under `ml/models/`, then run:

```powershell
docker compose config
docker compose up --build
```

The frontend is published on the configured `FRONTEND_PORT` (default `8080`) and proxies `/api/` to the backend over Compose networking. PostgreSQL data is persisted in the `postgres-data` volume. See [docs/deployment.md](docs/deployment.md).

## Validation

```powershell
pnpm --dir frontend run typecheck
pnpm --dir frontend run build
cd backend
python -m pytest -q
python -m compileall -q app alembic tests
```

CI runs these checks on pushes and pull requests and does not deploy. Artifact-dependent inference tests are skipped when the intentionally untracked model artifact is absent.
#
