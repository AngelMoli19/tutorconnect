"""Models for tutor resources."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ResourceType(str, enum.Enum):
    LINK = "LINK"
    FILE = "FILE"
    VIDEO = "VIDEO"
    DOCUMENT = "DOCUMENT"
    PRESENTATION = "PRESENTATION"
    OTHER = "OTHER"


class ResourceScope(str, enum.Enum):
    GENERAL = "GENERAL"
    PERSONALIZADA = "PERSONALIZADA"


class Resource(Base):
    """Resources shared by tutors."""

    __tablename__ = "resources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_type: Mapped[ResourceType] = mapped_column(Enum(ResourceType), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    scope: Mapped[ResourceScope] = mapped_column(Enum(ResourceScope), nullable=False, default=ResourceScope.GENERAL)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    tutor = relationship("User", foreign_keys=[tutor_id])
    invites: Mapped[list["ResourceInvite"]] = relationship(
        "ResourceInvite",
        back_populates="resource",
        cascade="all, delete-orphan",
    )


class ResourceInvite(Base):
    """Link between resources and invited tutorandos."""

    __tablename__ = "resource_invites"

    resource_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("resources.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tutorando_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    resource: Mapped["Resource"] = relationship("Resource", back_populates="invites")
    tutorando: Mapped["User"] = relationship("User")
