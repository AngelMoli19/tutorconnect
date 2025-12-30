"""Schemas for tutor resources."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models.resource import ResourceScope, ResourceType
from app.schemas.user import AdminUserPublic


class ResourceCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    url: HttpUrl
    resource_type: ResourceType = ResourceType.LINK
    scope: ResourceScope = ResourceScope.GENERAL
    tutorando_ids: list[UUID] | None = None


class ResourcePublic(BaseModel):
    id: UUID
    title: str
    description: str | None
    url: str
    resource_type: ResourceType
    scope: ResourceScope
    created_at: datetime
    tutor: AdminUserPublic
    invited_tutorandos: list[AdminUserPublic]

    model_config = ConfigDict(from_attributes=True)
