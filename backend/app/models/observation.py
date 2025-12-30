"""Models for tutor observations."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ObservationCategory(str, enum.Enum):
    ACADEMICA = "ACADEMICA"
    EMOCIONAL = "EMOCIONAL"
    GENERAL = "GENERAL"


class Observation(Base):
    """Observation or progress note from a tutor."""

    __tablename__ = "observations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    tutorando_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sessions.id", ondelete="SET NULL"),
        nullable=True,
    )
    category: Mapped[ObservationCategory] = mapped_column(Enum(ObservationCategory), nullable=False)
    summary: Mapped[str] = mapped_column(String(200), nullable=False)
    details: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tutor = relationship("User", foreign_keys=[tutor_id])
    tutorando = relationship("User", foreign_keys=[tutorando_id])
