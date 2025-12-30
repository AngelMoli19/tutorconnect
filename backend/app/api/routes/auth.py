"""Authentication endpoints shared across all roles."""

from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.password_reset import PasswordResetToken
from app.models.user import Profile, User
from app.schemas.auth import ForgotPasswordRequest, LoginRequest, ResetPasswordRequest, Token
from app.services.email_service import send_email

router = APIRouter()


@router.post("/login", response_model=Token)
def login(credentials: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """Authenticate user by DNI and password."""
    user: User | None = db.query(User).filter(User.dni == credentials.dni).first()
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales invalidas.",
        )

    token, expires_at = create_access_token(subject=user.dni, role=user.role.value)
    return Token(access_token=token, expires_at=expires_at, role=user.role)


@router.post("/forgot-password", response_model=dict)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Send a password reset email if the user exists."""
    identifier = payload.identifier.strip()
    user: User | None = None

    if "@" in identifier:
        user = (
            db.query(User)
            .join(Profile, Profile.user_id == User.id)
            .filter(Profile.email.ilike(identifier))
            .first()
        )
    else:
        user = db.query(User).filter(User.dni == identifier).first()

    if user and user.is_active:
        email = user.profile.email if user.profile else None
        if email:
            now = datetime.now(timezone.utc)
            db.query(PasswordResetToken).filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.used_at.is_(None),
            ).update({PasswordResetToken.used_at: now}, synchronize_session=False)

            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            expires_at = now + timedelta(minutes=30)
            record = PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            db.add(record)
            db.commit()

            settings = get_settings()
            base_url = str(settings.public_base_url or "http://localhost:5173").rstrip("/")
            reset_link = f"{base_url}/reset-password?token={raw_token}"
            body = (
                "Recibimos una solicitud para restablecer tu contrasena.\n\n"
                f"Enlace de restablecimiento: {reset_link}\n"
                f"Token (si lo necesitas manualmente): {raw_token}\n"
                "Este enlace vence en 30 minutos.\n"
            )
            send_email("Restablecer contrasena", body, [email])

    return {"message": "Si el usuario existe, enviaremos un correo con instrucciones."}


@router.post("/reset-password", response_model=dict)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    """Reset password using a valid token."""
    token_hash = hashlib.sha256(payload.token.strip().encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)

    record: PasswordResetToken | None = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at >= now,
        )
        .first()
    )
    if record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido o expirado.")

    user = db.query(User).filter(User.id == record.user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token invalido o expirado.")

    user.password_hash = get_password_hash(payload.new_password)
    record.used_at = now
    db.commit()

    return {"message": "Contrasena actualizada."}
