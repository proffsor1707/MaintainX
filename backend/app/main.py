import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as v1_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.app_env)

    application = FastAPI(title="Maintenance API", version="0.1.0")
    application.include_router(v1_router, prefix=settings.api_v1_prefix)
    register_exception_handlers(application)

    if settings.frontend_origins_list:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=settings.frontend_origins_list,
            allow_credentials=False,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Content-Type", "Authorization"],
        )

    logger.info("Maintenance API initialized", extra={"environment": settings.app_env})
    return application


app = create_app()