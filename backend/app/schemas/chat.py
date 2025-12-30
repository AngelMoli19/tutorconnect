"""Schemas for chat threads and messages."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.user import UserRole
from app.schemas.user import AdminUserPublic


class ChatThreadCreate(BaseModel):
    tutorando_id: UUID | None = None
    tutor_id: UUID | None = None


class ChatThreadKind(str, Enum):
    DIRECT = "DIRECT"
    GROUP = "GROUP"


class ChatThreadPublic(BaseModel):
    id: UUID
    tutor: AdminUserPublic
    tutorando: AdminUserPublic | None = None
    last_message: str | None
    last_message_at: datetime | None
    kind: ChatThreadKind
    title: str | None = None
    tutor_typing_at: datetime | None = None
    tutorando_typing_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ChatMessageCreate(BaseModel):
    body: str | None = Field(default=None, max_length=2000)
    link_url: str | None = Field(default=None, max_length=2000)
    reply_to_id: UUID | None = None

    @model_validator(mode="after")
    def validate_content(self) -> "ChatMessageCreate":
        body = (self.body or "").strip()
        link = (self.link_url or "").strip()
        if not body and not link:
            raise ValueError("Debe escribir un mensaje o adjuntar un enlace.")
        self.body = body or None
        self.link_url = link or None
        return self


class ChatMessageReply(BaseModel):
    id: UUID
    body: str | None
    attachment_url: str | None
    attachment_name: str | None
    attachment_type: str | None
    sender: AdminUserPublic

    model_config = ConfigDict(from_attributes=True)


class ChatMessagePublic(BaseModel):
    id: UUID
    body: str
    created_at: datetime
    from_me: bool
    sender_role: UserRole
    sender: AdminUserPublic
    read_at: datetime | None = None
    attachment_url: str | None = None
    attachment_name: str | None = None
    attachment_type: str | None = None
    reply_to: ChatMessageReply | None = None

    model_config = ConfigDict(from_attributes=True)


class ChatTypingPayload(BaseModel):
    is_typing: bool = True
