"""Models for tutor-tutorando chat."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ChatThread(Base):
    """Chat thread between a tutor and a tutorando."""

    __tablename__ = "chat_threads"
    __table_args__ = (
        UniqueConstraint("tutor_id", "tutorando_id", name="uq_chat_thread_pair"),
        UniqueConstraint("tutor_id", "group_key", name="uq_chat_thread_group"),
    )

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
    group_key: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tutor_typing_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    tutorando_typing_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tutor = relationship("User", foreign_keys=[tutor_id])
    tutorando = relationship("User", foreign_keys=[tutorando_id])
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="thread",
        cascade="all, delete-orphan",
    )


class ChatMessage(Base):
    """Message inside a chat thread."""

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_threads.id", ondelete="CASCADE"),
        nullable=False,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attachment_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reply_to_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    thread: Mapped["ChatThread"] = relationship("ChatThread", back_populates="messages")
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    reply_to: Mapped["ChatMessage | None"] = relationship("ChatMessage", remote_side=[id])
