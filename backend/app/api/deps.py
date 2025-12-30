"""Reusable dependencies for API routes."""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Authenticate user based on JWT token."""
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticacion invalido.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    dni: str | None = payload.get("sub")
    if dni is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user: User | None = db.query(User).filter(User.dni == dni).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """Ensure the requester has administrator privileges."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permisos insuficientes.",
        )
    return current_user
