"""Schemas for tutor observations."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.observation import ObservationCategory
from app.schemas.user import AdminUserPublic


class ObservationCreate(BaseModel):
    tutorando_id: UUID
    session_id: UUID | None = None
    category: ObservationCategory = ObservationCategory.GENERAL
    summary: str = Field(..., min_length=3, max_length=200)
    details: str = Field(..., min_length=3)


class ObservationPublic(BaseModel):
    id: UUID
    category: ObservationCategory
    summary: str
    details: str
    created_at: datetime
    tutor: AdminUserPublic
    tutorando: AdminUserPublic
    session_id: UUID | None

    model_config = ConfigDict(from_attributes=True)
