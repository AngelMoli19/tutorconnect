"""Routes for academic catalogs (faculties and schools)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.schemas.catalog import FacultyPublic, SchoolPublic
from app.services.catalog_service import list_faculties, list_schools

router = APIRouter()


@router.get("/faculties", response_model=list[FacultyPublic])
def get_faculties(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[FacultyPublic]:
    """List all faculties."""
    return list_faculties(db)


@router.get("/schools", response_model=list[SchoolPublic])
def get_schools(
    faculty_id: UUID | None = None,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
) -> list[SchoolPublic]:
    """List schools, optionally filtered by faculty."""
    return list_schools(db, faculty_id)
