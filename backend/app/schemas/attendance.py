"""Schemas for session attendance."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.attendance import AttendanceStatus
from app.schemas.user import AdminUserPublic
from app.schemas.session import SessionPublic


class AttendanceEntryUpdate(BaseModel):
    tutorando_id: UUID
    status: AttendanceStatus


class AttendanceBatchUpdate(BaseModel):
    entries: list[AttendanceEntryUpdate] = Field(default_factory=list)


class AttendancePublic(BaseModel):
    tutorando: AdminUserPublic
    status: AttendanceStatus | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TutorandoAttendancePublic(BaseModel):
    session: SessionPublic
    status: AttendanceStatus | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)
