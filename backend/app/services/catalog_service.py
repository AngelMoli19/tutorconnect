"""Domain services for catalog data (faculties and schools)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.models.catalog import Faculty, School


def list_faculties(db: Session) -> list[Faculty]:
    """Return all faculties sorted by name."""
    return db.query(Faculty).order_by(Faculty.name.asc()).all()


def list_schools(db: Session, faculty_id: UUID | None = None) -> list[School]:
    """Return schools, optionally filtered by faculty."""
    query = db.query(School)
    if faculty_id:
        query = query.filter(School.faculty_id == faculty_id)
    return query.order_by(School.name.asc()).all()
