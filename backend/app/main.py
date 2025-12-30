"""Entrypoint for the FastAPI application."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import get_settings
from app.scheduler import shutdown_scheduler, start_scheduler

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events: startup and shutdown."""
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

if settings.allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.get("/health", tags=["status"])
async def healthcheck() -> dict[str, str]:
    """Service heartbeat."""
    return {"status": "ok"}


app.include_router(api_router, prefix="/api")

uploads_dir = Path(settings.uploads_dir)
if not uploads_dir.is_absolute():
    uploads_dir = Path(__file__).resolve().parent.parent / settings.uploads_dir
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
