"""Service layer for resources."""

from __future__ import annotations

import re
import uuid
from pathlib import Path
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.models.resource import Resource, ResourceInvite, ResourceScope, ResourceType
from app.models.user import Profile, TutorAssignment, User, UserRole
from app.core.config import get_settings
from app.schemas.resource import ResourceCreate, ResourcePublic
from app.schemas.user import build_admin_user_public
from app.services.email_service import send_email


class ResourceServiceError(Exception):
    """Base resource service error."""


class UnauthorizedError(ResourceServiceError):
    """Raised when a user lacks permissions."""


class NotFoundError(ResourceServiceError):
    """Raised when resource not found."""


def _sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    name = name.replace(" ", "_")
    name = re.sub(r"[^A-Za-z0-9._-]", "", name)
    return name or "archivo"


def _infer_resource_type(filename: str, mime: str | None) -> ResourceType:
    ext = Path(filename).suffix.lower()
    if ext in {".pdf"}:
        return ResourceType.DOCUMENT
    if ext in {".ppt", ".pptx"}:
        return ResourceType.PRESENTATION
    if ext in {".mp4", ".mov", ".avi", ".mkv"}:
        return ResourceType.VIDEO
    if mime and mime.startswith("video/"):
        return ResourceType.VIDEO
    return ResourceType.FILE


def _validate_tutorandos(db: Session, tutor: User, tutorando_ids: list[UUID]) -> list[UUID]:
    assignments = db.scalars(
        select(TutorAssignment.tutorando_id).where(
            TutorAssignment.tutor_id == tutor.id,
            TutorAssignment.active.is_(True),
            TutorAssignment.tutorando_id.in_(tutorando_ids),
        )
    ).all()
    valid = list(assignments)
    if len(valid) != len(set(tutorando_ids)):
        raise UnauthorizedError("Solo puedes compartir recursos con tutorados asignados.")
    return valid


def create_link_resource(db: Session, tutor: User, payload: ResourceCreate) -> ResourcePublic:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede crear recursos.")

    tutorando_ids = payload.tutorando_ids or []
    valid_tutorando_ids: list[UUID] = []
    if payload.scope == ResourceScope.PERSONALIZADA:
        if not tutorando_ids:
            raise ResourceServiceError("Debe seleccionar al menos un tutorado.")
        valid_tutorando_ids = _validate_tutorandos(db, tutor, tutorando_ids)

    resource = Resource(
        tutor_id=tutor.id,
        title=payload.title,
        description=payload.description,
        url=str(payload.url),
        resource_type=payload.resource_type,
        scope=payload.scope,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    if valid_tutorando_ids:
        invites = [ResourceInvite(resource_id=resource.id, tutorando_id=t_id) for t_id in valid_tutorando_ids]
        db.add_all(invites)
        db.commit()
        db.refresh(resource)
    _notify_resource(db, tutor, resource, valid_tutorando_ids)
    return _build_resource_public(resource)


def create_upload_resource(
    db: Session,
    tutor: User,
    title: str,
    description: str | None,
    scope: ResourceScope,
    tutorando_ids: list[UUID],
    filename: str,
    file_bytes: bytes,
    mime_type: str | None,
) -> ResourcePublic:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede crear recursos.")

    valid_tutorando_ids: list[UUID] = []
    if scope == ResourceScope.PERSONALIZADA:
        if not tutorando_ids:
            raise ResourceServiceError("Debe seleccionar al menos un tutorado.")
        valid_tutorando_ids = _validate_tutorandos(db, tutor, tutorando_ids)

    settings = get_settings()
    base_dir = Path(settings.uploads_dir)
    if not base_dir.is_absolute():
        base_dir = Path(__file__).resolve().parents[2] / settings.uploads_dir
    resources_dir = base_dir / "resources"
    resources_dir.mkdir(parents=True, exist_ok=True)

    safe_name = _sanitize_filename(filename)
    stored_name = f"{uuid.uuid4()}_{safe_name}"
    stored_path = resources_dir / stored_name
    stored_path.write_bytes(file_bytes)

    url = f"/uploads/resources/{stored_name}"
    resource = Resource(
        tutor_id=tutor.id,
        title=title,
        description=description,
        url=url,
        resource_type=_infer_resource_type(filename, mime_type),
        scope=scope,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    if valid_tutorando_ids:
        invites = [ResourceInvite(resource_id=resource.id, tutorando_id=t_id) for t_id in valid_tutorando_ids]
        db.add_all(invites)
        db.commit()
        db.refresh(resource)
    _notify_resource(db, tutor, resource, valid_tutorando_ids)
    return _build_resource_public(resource)


def list_resources_for_tutor(db: Session, tutor: User) -> list[ResourcePublic]:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede ver sus recursos.")

    resources = (
        db.scalars(
            select(Resource)
            .options(
                selectinload(Resource.tutor),
                selectinload(Resource.invites).selectinload(ResourceInvite.tutorando).selectinload(User.profile),
            )
            .where(Resource.tutor_id == tutor.id)
            .order_by(Resource.created_at.desc())
        )
        .all()
    )
    return [_build_resource_public(resource) for resource in resources]


def list_resources_for_tutorando(db: Session, tutorando: User) -> list[ResourcePublic]:
    if tutorando.role != UserRole.TUTORANDO:
        raise UnauthorizedError("Solo un tutorado puede ver recursos.")

    tutor_ids = [
        assignment.tutor_id
        for assignment in db.scalars(
            select(TutorAssignment).where(
                TutorAssignment.tutorando_id == tutorando.id,
                TutorAssignment.active.is_(True),
            )
        ).all()
    ]

    resources = (
        db.scalars(
            select(Resource)
            .options(
                selectinload(Resource.tutor),
                selectinload(Resource.invites).selectinload(ResourceInvite.tutorando).selectinload(User.profile),
            )
            .where(
                or_(
                    Resource.scope == ResourceScope.GENERAL,
                    Resource.id.in_(
                        select(ResourceInvite.resource_id).where(ResourceInvite.tutorando_id == tutorando.id)
                    ),
                ),
                Resource.tutor_id.in_(tutor_ids),
            )
            .order_by(Resource.created_at.desc())
        )
        .all()
    )
    return [_build_resource_public(resource) for resource in resources]


def delete_resource(db: Session, tutor: User, resource_id: UUID) -> None:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede eliminar recursos.")

    resource = db.query(Resource).filter(Resource.id == resource_id, Resource.tutor_id == tutor.id).first()
    if resource is None:
        raise NotFoundError("Recurso no encontrado.")

    db.delete(resource)
    db.commit()


def _build_resource_public(resource: Resource) -> ResourcePublic:
    return ResourcePublic.model_validate(
        {
            "id": resource.id,
            "title": resource.title,
            "description": resource.description,
            "url": resource.url,
            "resource_type": resource.resource_type,
            "scope": resource.scope,
            "created_at": resource.created_at,
            "tutor": build_admin_user_public(resource.tutor),
            "invited_tutorandos": [
                build_admin_user_public(inv.tutorando) for inv in getattr(resource, "invites", []) if inv.tutorando is not None
            ],
        }
    )


def _notify_resource(db: Session, tutor: User, resource: Resource, invited_ids: list[UUID]) -> None:
    recipient_ids: list[UUID] = []
    if resource.scope == ResourceScope.PERSONALIZADA:
        recipient_ids = invited_ids
    else:
        recipient_ids = [
            assignment.tutorando_id
            for assignment in db.scalars(
                select(TutorAssignment).where(
                    TutorAssignment.tutor_id == tutor.id,
                    TutorAssignment.active.is_(True),
                )
            ).all()
        ]
    if not recipient_ids:
        return
    emails = db.scalars(select(Profile.email).where(Profile.user_id.in_(recipient_ids))).all()
    recipients = sorted({email for email in emails if email})
    if not recipients:
        return
    link = resource.url
    settings = get_settings()
    if link.startswith("/") and settings.public_base_url:
        link = f"{settings.public_base_url}{link}"
    body = (
        f"Se ha compartido un nuevo recurso.\n\n"
        f"Título: {resource.title}\n"
        f"Descripción: {resource.description or 'Sin descripción'}\n"
        f"Enlace: {link}\n"
    )
    send_email("Nuevo recurso compartido", body, recipients)
