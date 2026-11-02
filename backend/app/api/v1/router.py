from fastapi import APIRouter, Depends

from app.api.auth import require_authenticated_user
from app.api.v1.endpoints import health, incidents, monitoring, predictions, recommendations, reports, systems, url_scan

router = APIRouter()
router.include_router(health.router, tags=["health"])
protected = [Depends(require_authenticated_user)]
router.include_router(url_scan.router, tags=["url scan"], dependencies=protected)
router.include_router(predictions.router, prefix="/predictions", tags=["predictions"], dependencies=protected)
router.include_router(incidents.router, prefix="/incidents", tags=["incidents"], dependencies=protected)
router.include_router(systems.router, prefix="/systems", tags=["systems"], dependencies=protected)
router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"], dependencies=protected)
router.include_router(reports.router, prefix="/reports", tags=["reports"], dependencies=protected)
router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"], dependencies=protected)
