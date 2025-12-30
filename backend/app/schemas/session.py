"""Schemas for tutoring sessions."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.session import SessionScope, SessionStatus
from app.schemas.user import AdminUserPublic, build_admin_user_public
from app.models.session import Session as SessionModel


class SessionCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    scheduled_at: datetime
    meeting_link: str | None = None
    scope: SessionScope = SessionScope.GENERAL
    tutorando_ids: list[UUID] | None = None


class SessionPublic(BaseModel):
    id: UUID
    title: str
    description: str | None
    scheduled_at: datetime
    meeting_link: str | None
    status: SessionStatus
    scope: SessionScope
    tutor: AdminUserPublic
    tutorando: AdminUserPublic | None
    invited_tutorandos: list[AdminUserPublic]

    model_config = ConfigDict(from_attributes=True)


class SessionUpdateRequest(BaseModel):
    status: SessionStatus | None = None
    scheduled_at: datetime | None = None
    meeting_link: str | None = None


def build_session_public(session: SessionModel) -> SessionPublic:
    """Helper to serialize a session with tutor and tutorando data."""
    return SessionPublic.model_validate(
        {
            "id": session.id,
            "title": session.title,
            "description": session.description,
            "scheduled_at": session.scheduled_at,
            "meeting_link": session.meeting_link,
            "status": session.status,
            "scope": session.scope,
            "tutor": build_admin_user_public(session.tutor),
            "tutorando": build_admin_user_public(session.tutorando) if session.tutorando else None,
            "invited_tutorandos": [
                build_admin_user_public(inv.tutorando) for inv in getattr(session, "invites", []) if inv.tutorando is not None
            ],
        }
    )
