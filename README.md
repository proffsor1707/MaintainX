# MaintainX maintenance dashboard

A React/Vite dashboard, FastAPI API, PostgreSQL persistence layer, and separate software failure-risk ML pipeline. The dashboard's local source scanner is distinct from the operational failure-risk model.

## Architecture

```text
Browser (React/Vite + Clerk)
  -> same-origin /api/v1 requests (Vite dev proxy or Nginx in Compose)
  -> FastAPI (/api/v1) + Clerk JWT verification
  -> repositories / SQLAlchemy 2.x
  -> PostgreSQL
  -> exported ML inference pipeline (separate from training)
```

The source scanner reads only a folder the user selects in the browser, analyzes it locally, and does not upload file contents. See [docs/architecture.md](docs/architecture.md) and [docs/deployment.md](docs/deployment.md).

## Local setup

### Configure services

Copy the local examples if needed and configure your Clerk instance. Local backend development uses SQLite by default. The API base URL is `/api/v1`; Vite forwards it to the local API on port 8000.

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path frontend/.env.local)) { Copy-Item frontend/.env.example frontend/.env.local }
if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
```

Set these Clerk values in the root `.env`:

- `CLERK_JWKS_URL` and `CLERK_ISSUER` from your Clerk instance

`backend/.env.example` selects a persistent local SQLite database so the API can run without Docker or PostgreSQL. To use PostgreSQL locally instead, set `DATABASE_URL` in `backend/.env` to your own local database URL. Set `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env.local` using your Clerk publishable key. Never put a Clerk secret key in the frontend.

### Start the API

Install backend dependencies once. Run migrations and start the API from `backend/`; it reads Clerk settings from the root `.env` and the database URL from `backend/.env`.
Use Python 3.11 or newer (the container uses Python 3.13).

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements/dev.txt
Set-Location backend
..\.venv\Scripts\python.exe -m alembic upgrade head
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify the public API health endpoint at `http://127.0.0.1:8000/api/v1/health`; it should return `{"status":"ok"}`. Protected dashboard APIs also require valid Clerk settings and a signed-in user.

### Start the frontend

In a second PowerShell window from the repository root:

```powershell
pnpm.cmd --dir frontend install --frozen-lockfile
pnpm.cmd --dir frontend run dev
```

Open `http://localhost:3000`. The Vite proxy target defaults to `http://127.0.0.1:8000`; set `API_PROXY_TARGET` only if your local API listens elsewhere.

## Local project scanner

In the dashboard, choose **Run new scan** or **Choose folder and scan**, then select project files you own or are authorized to inspect. Each run clears previous findings and reads the newly selected files in the browser. Chromium-based browsers support selecting a folder; other browsers can select files. The scanner checks selected source/config files for a small set of risky patterns, skips dependency/build folders and oversized or unsupported files, and redacts likely credential values in displayed evidence. Findings are observations: TLS verification explicitly disabled is reported as a confirmed unsafe pattern; other matches are warnings for review. No matches do not prove the project is secure, and this scanner does not audit package vulnerabilities or run code.

The same scanner can analyze a directory directly from PowerShell. Pass the exact authorized directory each time; it prints finding locations and descriptions but not source evidence:

```powershell
node scripts/scan-project.mjs .
```

## ML pipeline

Training is isolated in `ml/`. The committed model documentation describes a small synthetic fixture; it is not production validated. See [ml/README.md](ml/README.md). Inference needs a trusted exported `inference_pipeline.joblib` and adjacent metadata file at the configured path.

## Docker Compose

For a full Compose run, set `DATABASE_URL` in the root `.env` to use `postgres` as the hostname (the local API process instead uses `localhost`), fill the other required configuration values, then run:

```powershell
docker compose config
docker compose up --build
```

The frontend is published on `FRONTEND_PORT` (default `8080`) and Nginx proxies `/api/` to the backend. PostgreSQL data is persisted in the `postgres-data` volume.

## Validation

```powershell
pnpm.cmd --dir frontend run typecheck
pnpm.cmd --dir frontend run build
pnpm.cmd --dir frontend run test:scan
Set-Location backend
..\.venv\Scripts\python.exe -m pytest -q
..\.venv\Scripts\python.exe -m compileall -q app alembic tests
```

The frontend package has no lint script configured. CI runs typecheck, build, and backend tests; it does not deploy.
