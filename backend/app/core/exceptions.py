"""Custom exception handlers for the FastAPI app."""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import uuid
from datetime import datetime, timezone


class AppException(Exception):
    """Base application exception."""

    def __init__(self, status_code: int, code: str, message: str, details: list | None = None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


class ValidationError(AppException):
    def __init__(self, message: str, details: list | None = None):
        super().__init__(400, "VALIDATION_ERROR", message, details)


class NotFoundError(AppException):
    def __init__(self, resource: str):
        super().__init__(404, "NOT_FOUND", f"{resource} not found")


class ConflictError(AppException):
    def __init__(self, message: str):
        super().__init__(409, "CONFLICT", message)


class PremiumRequiredError(AppException):
    def __init__(self, feature: str = "This feature"):
        super().__init__(
            403,
            "PREMIUM_REQUIRED",
            f"{feature} requires a premium subscription.",
            [{"upgrade_url": "/subscription/upgrade", "pricing": {"premium": "₹99/month"}}],
        )


class RateLimitError(AppException):
    def __init__(self):
        super().__init__(429, "RATE_LIMITED", "Too many requests. Please try again later.")


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            },
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": [],
            },
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred.",
                "details": [],
            },
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
