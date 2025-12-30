"""Pydantic schemas for academic catalogs."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FacultyPublic(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class SchoolPublic(BaseModel):
    id: UUID
    faculty_id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)
