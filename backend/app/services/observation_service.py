"""Service layer for observations."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.observation import Observation
from app.models.session import Session as SessionModel
from app.models.user import TutorAssignment, User, UserRole
from app.schemas.observation import ObservationCreate, ObservationPublic
from app.schemas.user import build_admin_user_public


class ObservationServiceError(Exception):
    """Base observation service error."""


class UnauthorizedError(ObservationServiceError):
    """Raised when a user lacks permissions."""


class NotFoundError(ObservationServiceError):
    """Raised when record not found."""


def _ensure_assignment(db: Session, tutor: User, tutorando_id: UUID) -> None:
    exists = db.scalar(
        select(TutorAssignment).where(
            TutorAssignment.tutor_id == tutor.id,
            TutorAssignment.tutorando_id == tutorando_id,
            TutorAssignment.active.is_(True),
        )
    )
    if not exists:
        raise UnauthorizedError("Solo puedes registrar observaciones para tutorados asignados.")


def create_observation(db: Session, tutor: User, payload: ObservationCreate) -> ObservationPublic:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede registrar observaciones.")

    _ensure_assignment(db, tutor, payload.tutorando_id)

    if payload.session_id:
        session = db.scalar(select(SessionModel).where(SessionModel.id == payload.session_id, SessionModel.tutor_id == tutor.id))
        if session is None:
            raise NotFoundError("Sesion no encontrada para este tutor.")

    observation = Observation(
        tutor_id=tutor.id,
        tutorando_id=payload.tutorando_id,
        session_id=payload.session_id,
        category=payload.category,
        summary=payload.summary,
        details=payload.details,
    )
    db.add(observation)
    db.commit()
    db.refresh(observation)
    return _build_observation_public(observation)


def list_observations_for_tutor(db: Session, tutor: User, tutorando_id: UUID | None = None) -> list[ObservationPublic]:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede ver observaciones.")

    query = (
        select(Observation)
        .options(
            selectinload(Observation.tutor),
            selectinload(Observation.tutorando).selectinload(User.profile),
        )
        .where(Observation.tutor_id == tutor.id)
        .order_by(Observation.created_at.desc())
    )
    if tutorando_id:
        query = query.where(Observation.tutorando_id == tutorando_id)

    observations = db.scalars(query).all()
    return [_build_observation_public(obs) for obs in observations]


def list_observations_for_tutorando(db: Session, tutorando: User) -> list[ObservationPublic]:
    if tutorando.role != UserRole.TUTORANDO:
        raise UnauthorizedError("Solo un tutorado puede ver observaciones.")

    observations = (
        db.scalars(
            select(Observation)
            .options(
                selectinload(Observation.tutor),
                selectinload(Observation.tutorando).selectinload(User.profile),
            )
            .where(Observation.tutorando_id == tutorando.id)
            .order_by(Observation.created_at.desc())
        )
        .all()
    )
    return [_build_observation_public(obs) for obs in observations]


def delete_observation(db: Session, tutor: User, observation_id: UUID) -> None:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede eliminar observaciones.")

    observation = db.query(Observation).filter(Observation.id == observation_id, Observation.tutor_id == tutor.id).first()
    if observation is None:
        raise NotFoundError("Observacion no encontrada.")
    db.delete(observation)
    db.commit()


def _build_observation_public(observation: Observation) -> ObservationPublic:
    return ObservationPublic.model_validate(
        {
            "id": observation.id,
            "category": observation.category,
            "summary": observation.summary,
            "details": observation.details,
            "created_at": observation.created_at,
            "tutor": build_admin_user_public(observation.tutor),
            "tutorando": build_admin_user_public(observation.tutorando),
            "session_id": observation.session_id,
        }
    )


def list_all_observations_for_admin(db: Session) -> list[ObservationPublic]:
    """List all observations in the system (admin only)."""
    observations = (
        db.scalars(
            select(Observation)
            .options(
                selectinload(Observation.tutor).selectinload(User.profile),
                selectinload(Observation.tutorando).selectinload(User.profile),
            )
            .order_by(Observation.created_at.desc())
        )
        .all()
    )
    return [_build_observation_public(obs) for obs in observations]
