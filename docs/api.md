# API reference

All routes are under `/api/v1`. JSON validation errors use FastAPI's 422 response. Business routes require a valid Clerk session JWT in `Authorization: Bearer <token>`; configure `CLERK_JWKS_URL` and `CLERK_ISSUER`. Health is public.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Public liveness response `{ "status": "ok" }` |
| POST | `/predictions` | Six Phase 8 features plus optional `system_id`; returns failure probability, risk level, model version and timestamp. If a system ID is provided, the prediction is persisted and that system must exist. |
| GET, POST | `/systems` | List systems / create a system |
| GET | `/systems/{system_id}` | Retrieve a system |
| PATCH | `/systems/{system_id}/status` | Update system status |
| GET, POST | `/monitoring/systems/{system_id}/metrics` | List or record CPU, memory, response-time, error-rate, or request-volume metrics |
| GET, POST | `/incidents` | Filter/list or create incidents |
| GET, PATCH | `/incidents/{incident_id}` | Retrieve or update an incident |
| GET | `/recommendations/{system_id}` | Deterministic recommendations for the latest persisted prediction; 404 if none exists |

List endpoints support bounded pagination where implemented. Metric values are range-validated by kind. System/incident identifiers are UUID validated. No report business endpoint is implemented yet.
