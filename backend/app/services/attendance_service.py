"""Service layer for session attendance."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.attendance import SessionAttendance
from app.models.session import Session, SessionInvite, SessionScope
from app.models.user import TutorAssignment, User, UserRole
from app.schemas.attendance import AttendanceBatchUpdate, AttendancePublic, TutorandoAttendancePublic
from app.schemas.user import build_admin_user_public
from app.services.session_service import list_sessions_for_tutorando


class AttendanceServiceError(Exception):
    """Base attendance service error."""


class UnauthorizedError(AttendanceServiceError):
    """Raised when user lacks permissions."""


class NotFoundError(AttendanceServiceError):
    """Raised when session not found."""


def _get_session(db: Session, tutor: User, session_id: UUID) -> Session:
    session = (
        db.query(Session)
        .options(
            selectinload(Session.invites).selectinload(SessionInvite.tutorando).selectinload(User.profile),
            selectinload(Session.tutor),
        )
        .filter(Session.id == session_id, Session.tutor_id == tutor.id)
        .first()
    )
    if session is None:
        raise NotFoundError("Sesion no encontrada.")
    return session


def _get_participants(db: Session, session: Session) -> list[User]:
    participants: list[User] = []
    if session.scope == SessionScope.PERSONALIZADA:
        participants = [inv.tutorando for inv in session.invites if inv.tutorando is not None]
    else:
        participants = (
            db.scalars(
                select(User)
                .join(TutorAssignment, TutorAssignment.tutorando_id == User.id)
                .options(selectinload(User.profile))
                .where(
                    TutorAssignment.tutor_id == session.tutor_id,
                    TutorAssignment.active.is_(True),
                )
            )
            .all()
        )
    if session.tutorando_id:
        if session.tutorando_id not in {user.id for user in participants}:
            legacy = db.query(User).options(selectinload(User.profile)).filter(User.id == session.tutorando_id).first()
            if legacy is not None:
                participants.append(legacy)
    participants.sort(key=lambda user: (user.profile.last_name_father, user.profile.last_name_mother, user.profile.first_name))
    return participants


def list_attendance_for_session(db: Session, tutor: User, session_id: UUID) -> list[AttendancePublic]:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede registrar asistencia.")

    session = _get_session(db, tutor, session_id)
    participants = _get_participants(db, session)
    records = db.scalars(
        select(SessionAttendance)
        .where(SessionAttendance.session_id == session.id)
    ).all()
    record_map = {record.tutorando_id: record for record in records}

    return [
        AttendancePublic(
            tutorando=build_admin_user_public(user),
            status=record_map.get(user.id).status if record_map.get(user.id) else None,
            updated_at=record_map.get(user.id).updated_at if record_map.get(user.id) else None,
        )
        for user in participants
    ]


def upsert_attendance(db: Session, tutor: User, session_id: UUID, payload: AttendanceBatchUpdate) -> list[AttendancePublic]:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede registrar asistencia.")

    session = _get_session(db, tutor, session_id)
    participants = _get_participants(db, session)
    allowed_ids = {user.id for user in participants}

    for entry in payload.entries:
        if entry.tutorando_id not in allowed_ids:
            raise UnauthorizedError("Solo puedes registrar asistencia para tutorados asignados a la sesion.")

        record = db.query(SessionAttendance).filter(
            SessionAttendance.session_id == session.id,
            SessionAttendance.tutorando_id == entry.tutorando_id,
        ).first()
        if record is None:
            record = SessionAttendance(
                session_id=session.id,
                tutorando_id=entry.tutorando_id,
                status=entry.status,
            )
            db.add(record)
        else:
            record.status = entry.status

    db.commit()
    return list_attendance_for_session(db, tutor, session_id)


def list_attendance_for_tutorando(db: Session, tutorando: User) -> list[TutorandoAttendancePublic]:
    if tutorando.role != UserRole.TUTORANDO:
        raise UnauthorizedError("Solo un tutorado puede ver su asistencia.")

    sessions = list_sessions_for_tutorando(db, tutorando)
    if not sessions:
        return []

    session_ids = [session.id for session in sessions]
    records = db.scalars(
        select(SessionAttendance).where(
            SessionAttendance.tutorando_id == tutorando.id,
            SessionAttendance.session_id.in_(session_ids),
        )
    ).all()
    record_map = {record.session_id: record for record in records}

    return [
        TutorandoAttendancePublic(
            session=session,
            status=record_map.get(session.id).status if record_map.get(session.id) else None,
            updated_at=record_map.get(session.id).updated_at if record_map.get(session.id) else None,
        )
        for session in sessions
    ]


def list_attendance_for_session_admin(db: Session, session_id: UUID) -> list[AttendancePublic]:
    """List attendance for any session (admin only)."""
    session = (
        db.query(Session)
        .options(
            selectinload(Session.invites).selectinload(SessionInvite.tutorando).selectinload(User.profile),
            selectinload(Session.tutor).selectinload(User.profile),
        )
        .filter(Session.id == session_id)
        .first()
    )
    if session is None:
        raise NotFoundError("Sesión no encontrada.")

    participants = _get_participants(db, session)
    records = db.scalars(
        select(SessionAttendance)
        .where(SessionAttendance.session_id == session.id)
    ).all()
    record_map = {record.tutorando_id: record for record in records}

    return [
        AttendancePublic(
            tutorando=build_admin_user_public(user),
            status=record_map.get(user.id).status if record_map.get(user.id) else None,
            updated_at=record_map.get(user.id).updated_at if record_map.get(user.id) else None,
        )
        for user in participants
    ]
