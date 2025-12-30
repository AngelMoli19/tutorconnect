"""Pydantic schemas for user-related operations."""

from __future__ import annotations

from datetime import date, datetime
from typing import Iterable
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, constr

from app.models.user import Gender, User, UserRole


class ProfileBase(BaseModel):
    first_name: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    last_name_father: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    last_name_mother: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    email: EmailStr
    gender: Gender
    phone: constr(pattern=r"^\d{9}$")  # type: ignore[valid-type]
    birthdate: date
    address: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    faculty: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    school: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    department: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    province: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]
    district: constr(min_length=1, strip_whitespace=True)  # type: ignore[valid-type]


class UserBase(BaseModel):
    dni: constr(min_length=8, max_length=15, strip_whitespace=True)  # type: ignore[valid-type]


class TutorCreateRequest(UserBase, ProfileBase):
    """Incoming payload to create a Tutor."""


class TutorandoCreateRequest(UserBase, ProfileBase):
    """Incoming payload to create un Tutorando."""

    enrollment_code: constr(min_length=4, strip_whitespace=True)  # type: ignore[valid-type]


class TutorUpdateRequest(TutorCreateRequest):
    """Payload para actualizar un tutor existente."""


class TutorandoUpdateRequest(TutorandoCreateRequest):
    """Payload para actualizar un tutorando existente."""


class ProfilePublic(ProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserPublic(UserBase):
    id: UUID
    role: UserRole
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    profile: ProfilePublic

    model_config = ConfigDict(from_attributes=True)


class AdminUserPublic(UserPublic):
    enrollment_code: str | None = None

    model_config = ConfigDict(from_attributes=True)


def build_admin_user_public(user: User) -> AdminUserPublic:
    """Convert a User ORM object into an AdminUserPublic schema."""
    base_data = UserPublic.model_validate(user).model_dump()
    enrollment_code = None
    profile = getattr(user, "profile", None)
    if profile and getattr(profile, "tutorando_profile", None):
        enrollment_code = profile.tutorando_profile.enrollment_code
    base_data["enrollment_code"] = enrollment_code
    return AdminUserPublic.model_validate(base_data)


def build_admin_user_list(users: Iterable[User]) -> list[AdminUserPublic]:
    """Helper to serialize multiple users."""
    return [build_admin_user_public(user) for user in users]
