"""Shared/common schemas — pagination, errors."""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=50)


class PaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[Any] = []


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    issue: str


class ErrorResponse(BaseModel):
    error: dict
    request_id: str
    timestamp: datetime


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    environment: str = "development"
