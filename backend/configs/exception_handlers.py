import logging
import traceback

from fastapi import Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR, HTTP_422_UNPROCESSABLE_CONTENT

from configs import config
from orion.services.log_manager.log_controller import log
from orion.shared_models.expection_handlers.expection_handlers_models import ErrorResponseModel, ValidationErrorDetail, ValidationErrorResponseModel

logger = logging.getLogger("uvicorn.error")


def is_api_request(request: Request) -> bool:
    path = request.url.path
    return path == "/api" or path.startswith("/api/")


async def global_exception_handler(request: Request, exc: Exception):
    status_code = exc.status_code if isinstance(exc, HTTPException) else HTTP_500_INTERNAL_SERVER_ERROR

    if not isinstance(exc, HTTPException) or status_code >= HTTP_500_INTERNAL_SERVER_ERROR:
        logger.error(
            "Unhandled request exception: %s %s",
            request.method,
            request.url.path,
            exc_info=(type(exc), exc, exc.__traceback__),
        )
        log.g().e(f"Unhandled request exception: {request.method} {request.url.path}\n" + "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)).strip())

    if is_api_request(request):
        detail = exc.detail if isinstance(exc, HTTPException) else "An unexpected error occurred"
        content = {"detail": detail}
        return JSONResponse(
            status_code=status_code,
            content=content,
            headers=exc.headers if isinstance(exc, HTTPException) else None,
        )

    if config.DEBUG:
        error_response = ErrorResponseModel(
            error="An unexpected error occurred", traceback=[])
        return JSONResponse(status_code=status_code, content=error_response.model_dump())

    return RedirectResponse(url=f"/{status_code}")


async def validation_exception_handler(request: Request, exc: Exception):
    if not isinstance(exc, RequestValidationError):
        return await global_exception_handler(request, exc)

    errors = [ValidationErrorDetail(
        field=".".join(str(loc) for loc in error["loc"][1:]), message=error["msg"], type=error["type"]) for error in
        exc.errors()]
    logger.warning(
        "Request validation failed: %s %s content_type=%s errors=%s",
        request.method,
        request.url.path,
        request.headers.get("content-type", ""),
        [error.model_dump() for error in errors],
    )
    log.g().w(f"Request validation failed: {request.method} {request.url.path} content_type={request.headers.get('content-type', '')} errors={[error.model_dump() for error in errors]}")

    if is_api_request(request):
        content = {
            "detail": "Request validation failed",
            "validation_errors": [error.model_dump() for error in errors],
        }
        return JSONResponse(
            status_code=HTTP_422_UNPROCESSABLE_CONTENT,
            content=content,
        )

    if config.DEBUG:
        error_response = ValidationErrorResponseModel(
            validation_errors=errors, traceback=[])
        return JSONResponse(status_code=HTTP_422_UNPROCESSABLE_CONTENT, content=error_response.model_dump())

    return RedirectResponse(url=f"/{HTTP_422_UNPROCESSABLE_CONTENT}")
