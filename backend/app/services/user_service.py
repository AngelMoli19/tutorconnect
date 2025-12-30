"""Business logic for user management."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from typing import Iterable
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_password_hash
from app.models.user import Profile, TutorAssignment, TutorProfile, TutorandoProfile, User, UserRole
from app.schemas.user import (
    TutorCreateRequest,
    TutorUpdateRequest,
    TutorandoCreateRequest,
    TutorandoUpdateRequest,
)


class UserServiceError(Exception):
    """Base class for user service domain errors."""


class DuplicateDniError(UserServiceError):
    """Raised when a DNI already exists."""


class DuplicateEnrollmentError(UserServiceError):
    """Raised when a matricula/code already exists."""


class UserNotFoundError(UserServiceError):
    """Raised when an expected user record cannot be located."""


class InvalidRoleError(UserServiceError):
    """Raised when an operation receives a user with an unexpected role."""


class AssignmentError(UserServiceError):
    """Raised when assignment logic fails."""


class AssignmentNotFoundError(UserServiceError):
    """Raised when an assignment cannot be found."""


@dataclass(slots=True)
class DashboardMetrics:
    """Container for admin dashboard totals."""

    tutors_total: int
    tutorandos_total: int
    sessions_total: int = 0  # Placeholder until sessions module exists

    def to_dict(self) -> dict[str, int]:
        return asdict(self)


def _build_profile(payload: TutorCreateRequest | TutorandoCreateRequest) -> dict[str, object]:
    """Return dict ready to instantiate Profile."""
    data = payload.model_dump()
    profile_fields = {
        "first_name",
        "last_name_father",
        "last_name_mother",
        "email",
        "gender",
        "phone",
        "birthdate",
        "address",
        "faculty",
        "school",
        "department",
        "province",
        "district",
    }
    return {key: data[key] for key in profile_fields}


def _build_user_base(payload: TutorCreateRequest | TutorandoCreateRequest, role: UserRole) -> User:
    """Create a new User instance without committing."""
    password_plain = payload.birthdate.strftime("%d%m%Y")
    user = User(
        dni=payload.dni,
        password_hash=get_password_hash(password_plain),
        role=role,
    )
    return user


def _update_profile_from_payload(profile: Profile, payload: TutorCreateRequest | TutorandoCreateRequest) -> None:
    """Apply payload data into an existing Profile entity."""
    profile_data = _build_profile(payload)
    for field, value in profile_data.items():
        setattr(profile, field, value)


def create_tutor(db: Session, payload: TutorCreateRequest) -> User:
    """Create a tutor user with associated profile."""
    if db.query(User.id).filter(User.dni == payload.dni).first():
        raise DuplicateDniError("El usuario con este DNI ya existe.")

    user = _build_user_base(payload, UserRole.TUTOR)
    profile = Profile(**_build_profile(payload))
    user.profile = profile
    user.profile.tutor_profile = TutorProfile()

    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise UserServiceError("Error al crear el tutor.") from exc
    db.refresh(user)
    return user


def create_tutorando(db: Session, payload: TutorandoCreateRequest) -> User:
    """Create a tutorando user with associated profile."""
    if db.query(User.id).filter(User.dni == payload.dni).first():
        raise DuplicateDniError("El usuario con este DNI ya existe.")

    if db.query(TutorandoProfile.id).filter(TutorandoProfile.enrollment_code == payload.enrollment_code).first():
        raise DuplicateEnrollmentError("El usuario o codigo de matricula ya existen en el sistema.")

    user = _build_user_base(payload, UserRole.TUTORANDO)
    profile = Profile(**_build_profile(payload))
    user.profile = profile
    user.profile.tutorando_profile = TutorandoProfile(enrollment_code=payload.enrollment_code)

    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise UserServiceError("Error al crear el tutorado.") from exc
    db.refresh(user)
    return user


def dashboard_metrics(db: Session) -> DashboardMetrics:
    """Return aggregated totals for the admin dashboard."""
    tutors_total = db.query(func.count(User.id)).filter(User.role == UserRole.TUTOR).scalar() or 0
    tutorandos_total = db.query(func.count(User.id)).filter(User.role == UserRole.TUTORANDO).scalar() or 0
    # Placeholder until session scheduling module is implemented.
    sessions_total = 0
    return DashboardMetrics(
        tutors_total=int(tutors_total),
        tutorandos_total=int(tutorandos_total),
        sessions_total=sessions_total,
    )


def update_tutor(db: Session, user_id: UUID, payload: TutorUpdateRequest) -> User:
    """Update tutor profile and credentials."""
    user = _load_user_by_id(db, user_id)
    if user is None:
        raise UserNotFoundError("Tutor no encontrado.")
    if user.role != UserRole.TUTOR:
        raise InvalidRoleError("El usuario seleccionado no es un tutor.")

    if user.dni != payload.dni:
        if db.query(User.id).filter(User.dni == payload.dni, User.id != user_id).first():
            raise DuplicateDniError("El usuario con este DNI ya existe.")
        user.dni = payload.dni

    birthdate_changed = user.profile.birthdate != payload.birthdate
    _update_profile_from_payload(user.profile, payload)

    if birthdate_changed:
        user.password_hash = get_password_hash(payload.birthdate.strftime("%d%m%Y"))

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise UserServiceError("Error al actualizar el tutor.") from exc

    db.refresh(user)
    return user


def update_tutorando(db: Session, user_id: UUID, payload: TutorandoUpdateRequest) -> User:
    """Update tutorando profile, credentials and enrollment code."""
    user = _load_user_by_id(db, user_id)
    if user is None:
        raise UserNotFoundError("Tutorado no encontrado.")
    if user.role != UserRole.TUTORANDO:
        raise InvalidRoleError("El usuario seleccionado no es un tutorado.")

    if user.dni != payload.dni:
        if db.query(User.id).filter(User.dni == payload.dni, User.id != user_id).first():
            raise DuplicateDniError("El usuario con este DNI ya existe.")
        user.dni = payload.dni

    tutorando_profile = user.profile.tutorando_profile
    if tutorando_profile is None:
        raise UserServiceError("Perfil de tutorado incompleto.")

    if tutorando_profile.enrollment_code != payload.enrollment_code:
        if (
            db.query(TutorandoProfile.id)
            .filter(
                TutorandoProfile.enrollment_code == payload.enrollment_code,
                TutorandoProfile.id != tutorando_profile.id,
            )
            .first()
        ):
            raise DuplicateEnrollmentError("El usuario o codigo de matricula ya existen en el sistema.")
        tutorando_profile.enrollment_code = payload.enrollment_code

    birthdate_changed = user.profile.birthdate != payload.birthdate
    _update_profile_from_payload(user.profile, payload)

    if birthdate_changed:
        user.password_hash = get_password_hash(payload.birthdate.strftime("%d%m%Y"))

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise UserServiceError("Error al actualizar el tutorado.") from exc

    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: UUID) -> User:
    """Soft delete a user and deactivate related assignments."""
    user = _load_user_by_id(db, user_id)
    if user is None:
        raise UserNotFoundError("Usuario no encontrado.")

    user.is_active = False

    if user.role == UserRole.TUTOR:
        assignments = db.query(TutorAssignment).filter(TutorAssignment.tutor_id == user.id).all()
        for assignment in assignments:
            assignment.active = False
    elif user.role == UserRole.TUTORANDO:
        assignments = db.query(TutorAssignment).filter(TutorAssignment.tutorando_id == user.id).all()
        for assignment in assignments:
            assignment.active = False

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise UserServiceError("Error al desactivar el usuario.") from exc

    db.refresh(user)
    return user


def list_users(db: Session, role: UserRole | None = None) -> list[User]:
    """Retrieve users with their profiles (and role-specific data)."""
    query = (
        db.query(User)
        .options(
            selectinload(User.profile).selectinload(Profile.tutor_profile),
            selectinload(User.profile).selectinload(Profile.tutorando_profile),
        )
    )
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()


def _load_user_by_id(db: Session, user_id: UUID) -> User | None:
    """Fetch user by UUID with related profile data."""
    return (
        db.query(User)
        .options(
            selectinload(User.profile).selectinload(Profile.tutorando_profile),
            selectinload(User.profile).selectinload(Profile.tutor_profile),
        )
        .filter(User.id == user_id)
        .first()
    )


def assign_tutorandos(
    db: Session,
    tutor_id: UUID,
    tutorando_ids: Iterable[UUID],
) -> tuple[User, list[TutorAssignment]]:
    """Assign a tutor to multiple tutorandos."""
    tutor = _load_user_by_id(db, tutor_id)
    if tutor is None:
        raise UserNotFoundError("Tutor no encontrado.")
    if tutor.role != UserRole.TUTOR:
        raise InvalidRoleError("El usuario seleccionado no es un tutor.")

    tutorando_ids_set = {UUID(str(_id)) for _id in tutorando_ids}
    if not tutorando_ids_set:
        raise AssignmentError("Debe seleccionar al menos un tutorado.")

    tutorandos = (
        db.query(User)
        .options(selectinload(User.profile).selectinload(Profile.tutorando_profile))
        .filter(User.id.in_(tutorando_ids_set))
        .all()
    )

    if len(tutorandos) != len(tutorando_ids_set):
        raise UserNotFoundError("Algun tutorado no existe.")

    invalid_roles = [user.dni for user in tutorandos if user.role != UserRole.TUTORANDO]
    if invalid_roles:
        raise InvalidRoleError("La lista incluye usuarios que no son tutorados.")

    for tutorando in tutorandos:
        assignment = (
            db.query(TutorAssignment)
            .filter(
                TutorAssignment.tutor_id == tutor_id,
                TutorAssignment.tutorando_id == tutorando.id,
            )
            .first()
        )
        if assignment:
            assignment.active = True
        else:
            db.add(
                TutorAssignment(
                    tutor_id=tutor_id,
                    tutorando_id=tutorando.id,
                    active=True,
                )
            )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AssignmentError("No se pudieron guardar las asignaciones.") from exc

    return get_tutor_assignments(db, tutor_id)


def get_tutor_assignments(
    db: Session,
    tutor_id: UUID,
    include_inactive: bool = False,
) -> tuple[User, list[TutorAssignment]]:
    """Return the tutor entity along with assignments."""
    tutor = _load_user_by_id(db, tutor_id)
    if tutor is None:
        raise UserNotFoundError("Tutor no encontrado.")
    if tutor.role != UserRole.TUTOR:
        raise InvalidRoleError("El usuario no es un tutor valido.")

    query = (
        db.query(TutorAssignment)
        .options(
            selectinload(TutorAssignment.tutorando)
            .selectinload(User.profile)
            .selectinload(Profile.tutorando_profile),
            selectinload(TutorAssignment.tutor).selectinload(User.profile),
        )
        .filter(TutorAssignment.tutor_id == tutor_id)
    )

    if not include_inactive:
        query = query.filter(TutorAssignment.active.is_(True))

    assignments = query.order_by(TutorAssignment.assigned_at.desc()).all()
    return tutor, assignments


def deactivate_assignment(
    db: Session,
    assignment_id: UUID,
    include_inactive: bool = False,
) -> tuple[User, list[TutorAssignment]]:
    """Deactivate a tutor assignment and return updated list."""
    assignment = (
        db.query(TutorAssignment)
        .options(
            selectinload(TutorAssignment.tutorando)
            .selectinload(User.profile)
            .selectinload(Profile.tutorando_profile),
            selectinload(TutorAssignment.tutor).selectinload(User.profile),
        )
        .filter(TutorAssignment.id == assignment_id)
        .first()
    )

    if assignment is None:
        raise AssignmentNotFoundError("Asignacion no encontrada.")

    assignment.active = False

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise AssignmentError("No se pudo desactivar la asignacion.") from exc

    return get_tutor_assignments(db, assignment.tutor_id, include_inactive=include_inactive)
