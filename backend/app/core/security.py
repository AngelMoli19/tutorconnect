"""Security helpers for hashing and JWT handling."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=[settings.password_hash_scheme], deprecated="auto")
ALGORITHM = "HS256"


def create_access_token(subject: str, role: str, expires_delta: timedelta | None = None) -> tuple[str, datetime]:
    """Generate a JWT access token."""
    expire = datetime.now(tz=timezone.utc) + (expires_delta or timedelta(minutes=settings.jwt_expire_minutes))
    to_encode: Dict[str, Any] = {"exp": expire, "sub": subject, "role": role}
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)
    return encoded_jwt, expire


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare plain password with hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return pwd_context.hash(password)


def decode_token(token: str) -> dict[str, Any]:
    """Decode a JWT token and return its payload."""
    try:
        payload: Dict[str, Any] = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise ValueError("Token invalido") from exc
