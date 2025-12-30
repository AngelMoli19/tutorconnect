"""Schemas for authentication endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, constr

from app.models.user import UserRole


class LoginRequest(BaseModel):
    dni: constr(min_length=8, max_length=15, strip_whitespace=True)  # type: ignore[valid-type]
    password: constr(min_length=4, strip_whitespace=True)  # type: ignore[valid-type]


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    role: UserRole


class TokenPayload(BaseModel):
    sub: str
    exp: int
    role: str


class ForgotPasswordRequest(BaseModel):
    identifier: constr(min_length=3, max_length=150, strip_whitespace=True)  # type: ignore[valid-type]


class ResetPasswordRequest(BaseModel):
    token: constr(min_length=10, strip_whitespace=True)  # type: ignore[valid-type]
    new_password: constr(min_length=6, max_length=128, strip_whitespace=True)  # type: ignore[valid-type]
