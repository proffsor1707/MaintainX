# Deployment

## Required configuration

Set configuration through the deployment environment or a private root `.env` file. `.env.example` contains placeholders only.

- `DATABASE_URL`: SQLAlchemy PostgreSQL URL; inside Compose the host must be `postgres`. URL-encode reserved characters in credentials.
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: initialize the Compose database. Use generated deployment secrets for the password.
- `CLERK_JWKS_URL`, `CLERK_ISSUER`: Clerk JWT verification configuration. Protected requests fail closed if either is absent.
- `FRONTEND_ORIGINS`: comma-separated exact browser origins for direct API access. Do not use `*` in production. When using the provided Nginx same-origin proxy, cross-origin CORS is not needed.
- `VITE_API_BASE_URL`: compiled frontend API base; `/api/v1` is appropriate for the supplied Nginx proxy. For another topology, set the externally reachable HTTPS API origin plus `/api/v1`.
- `MODEL_ARTIFACT_PATH`: backend path to a trusted exported joblib inference pipeline; default is `ml/models/inference_pipeline.joblib` for local runs and `/workspace/ml/models/inference_pipeline.joblib` in the container.
- `APP_ENV`, `API_V1_PREFIX`, `FRONTEND_PORT`: runtime configuration.

Never put a Clerk secret key, database password, or populated `.env` file in the frontend, image, repository, or logs. The current implementation verifies Clerk JWT signatures with JWKS and issuer but does not implement per-user data ownership because the schema has no user/system association.

For local development, the frontend `.env.local` uses `/api/v1`, and Vite proxies that path to `http://127.0.0.1:8000` (override with `API_PROXY_TARGET`). Backend settings read the project root and `backend/.env` independent of the process working directory; `python-dotenv` is installed by the backend base requirements. `backend/.env.example` uses a persistent SQLite file for local development, while deployments should use PostgreSQL. The public health endpoint does not need a database or Clerk token; protected system/incident routes need a database and valid Clerk JWKS URL and issuer.

The dashboard's **Local source scan** is a separate browser-only feature. It scans only the folder the user selects and never uploads its contents. It checks a small set of source patterns, not dependency advisories or runtime behavior. Each new folder selection starts a fresh scan and clears previous results.

## Compose deployment

1. Supply the required values in a protected environment or a local untracked `.env`.
2. Place trusted `inference_pipeline.joblib` and its `metadata.json` beside one another in `ml/models/`. The model files are intentionally ignored by Git; Compose mounts this directory read-only.
3. Validate configuration and start:

```sh
docker compose config
docker compose up --build -d
```

4. The backend container waits for PostgreSQL health, applies `alembic upgrade head`, then starts Uvicorn without reload. Do not run this migration startup pattern with multiple concurrent backend replicas without a dedicated migration job/lock strategy.
5. Check frontend/backend container health. PostgreSQL has a persistent named volume; back it up before upgrades or maintenance.

TLS termination, domain routing, secret management, backups, and Clerk production instance configuration must be supplied by the hosting platform. This repository contains no automatic deployment workflow.
