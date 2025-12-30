"""Schemas relacionados con asignaciones entre tutores y tutorados."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Iterable
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.user import AdminUserPublic, build_admin_user_public

if TYPE_CHECKING:
    from app.models.user import TutorAssignment


class AssignmentCreateRequest(BaseModel):
    tutor_id: UUID
    tutorando_ids: list[UUID] = Field(min_length=1)

    @model_validator(mode="after")
    def ensure_unique_ids(self) -> "AssignmentCreateRequest":
        """Valida que no existan tutorados duplicados en la asignacion."""
        if len(self.tutorando_ids) != len(set(self.tutorando_ids)):
            raise ValueError("Los tutorados no pueden repetirse en la solicitud.")
        return self


class AssignmentTutorando(BaseModel):
    assignment_id: UUID
    tutorando: AdminUserPublic
    assigned_at: datetime
    active: bool

    model_config = ConfigDict(from_attributes=True)


class AssignmentResponse(BaseModel):
    tutor: AdminUserPublic
    tutorandos: list[AssignmentTutorando]


def build_assignment_tutorandos(assignments: Iterable["TutorAssignment"]) -> list[AssignmentTutorando]:
    """Convierte asignaciones ORM en representaciones Pydantic."""
    result: list[AssignmentTutorando] = []
    for assignment in assignments:
        tutorando_public = build_admin_user_public(assignment.tutorando)
        result.append(
            AssignmentTutorando(
                assignment_id=assignment.id,
                tutorando=tutorando_public,
                assigned_at=assignment.assigned_at,
                active=assignment.active,
            )
        )
    return result
