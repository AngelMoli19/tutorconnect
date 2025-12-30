"""Session model for tutoring sessions."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SessionStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELED = "CANCELED"


class SessionScope(str, enum.Enum):
    GENERAL = "GENERAL"
    PERSONALIZADA = "PERSONALIZADA"


class Session(Base):
    """Tutoring session model."""

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    tutorando_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    meeting_link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), nullable=False, default=SessionStatus.SCHEDULED)
    scope: Mapped[SessionScope] = mapped_column(Enum(SessionScope), nullable=False, default=SessionScope.GENERAL)
    reminder_sent: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    tutor = relationship("User", foreign_keys=[tutor_id])
    tutorando = relationship("User", foreign_keys=[tutorando_id])
    invites: Mapped[list["SessionInvite"]] = relationship(
        "SessionInvite",
        back_populates="session",
        cascade="all, delete-orphan",
    )


class SessionInvite(Base):
    """Link between session and invited tutorandos (for personalized scope)."""

    __tablename__ = "session_invites"

    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tutorando_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    session: Mapped["Session"] = relationship("Session", back_populates="invites")
    tutorando: Mapped["User"] = relationship("User")
