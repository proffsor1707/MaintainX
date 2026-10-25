import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.schemas.common import ErrorResponse

logger = logging.getLogger(__name__)


class AppException(Exception):
    def __init__(self, message: str, *, code: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


def register_exception_handlers(application: FastAPI) -> None:
    @application.exception_handler(AppException)
    async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
        logger.warning("Application error", extra={"path": request.url.path, "code": exc.code})
        payload = ErrorResponse(code=exc.code, message=exc.message)
        return JSONResponse(status_code=exc.status_code, content=payload.model_dump())

    @application.exception_handler(Exception)
    async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
        logger.error(
            "Unhandled request error",
            extra={"path": request.url.path, "exception_type": type(exc).__name__},
        )
        payload = ErrorResponse(code="internal_error", message="An unexpected error occurred.")
        return JSONResponse(status_code=500, content=payload.model_dump())