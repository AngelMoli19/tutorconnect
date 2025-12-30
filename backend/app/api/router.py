"""Aggregate API routers for the application."""

from fastapi import APIRouter

from app.api.routes import admin, auth, catalogs, tutor, tutorando

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(catalogs.router, prefix="/catalogs", tags=["catalogs"])
api_router.include_router(tutorando.router, prefix="/tutorando", tags=["tutorando"])
api_router.include_router(tutor.router, prefix="/tutor", tags=["tutor"])
