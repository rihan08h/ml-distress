"""Smart-Medicine-Hub — FastAPI Application."""

from contextlib import asynccontextmanager
import structlog

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.v1.router import api_router
from app.core.exceptions import AppException, app_exception_handler, http_exception_handler, generic_exception_handler
from app.core.middleware import RequestIdMiddleware, LoggingMiddleware
from app.db.session import engine

logger = structlog.get_logger()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("starting_application", environment=settings.ENVIRONMENT)
    # DB tables created by Alembic in production; engine.begin() for dev if needed
    yield
    await engine.dispose()
    logger.info("application_shutdown")


app = FastAPI(
    title="Smart-Medicine-Hub",
    description="AI-powered medicine search, safety checks, symptom analysis, and pharmacy locator",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# -- CORS --
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Custom middleware --
app.add_middleware(RequestIdMiddleware)
app.add_middleware(LoggingMiddleware)

# -- Exception handlers --
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# -- Routes --
app.include_router(api_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "smart-medicine-api",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Smart-Medicine-Hub API",
        "docs": "/docs",
        "health": "/health",
    }
