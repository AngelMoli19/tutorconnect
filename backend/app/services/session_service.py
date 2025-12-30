"""Business logic for tutoring sessions."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from sqlalchemy import or_
from app.models.session import Session, SessionInvite, SessionScope, SessionStatus
from app.models.user import Profile, TutorAssignment, User, UserRole
from app.schemas.session import SessionCreate, SessionUpdateRequest
from app.schemas.session import SessionPublic, build_session_public
from app.services.email_service import send_email


class SessionServiceError(Exception):
    """Base session service error."""


class UnauthorizedError(SessionServiceError):
    """Raised when a user lacks permissions."""


class NotFoundError(SessionServiceError):
    """Raised when session or user not found."""

def _auto_complete_sessions(db: Session, tutor_ids: list[UUID]) -> None:
    if not tutor_ids:
        return
    cutoff = datetime.now(timezone.utc) - timedelta(hours=6)
    result = db.execute(
        update(Session)
        .where(
            Session.tutor_id.in_(tutor_ids),
            Session.status == SessionStatus.SCHEDULED,
            Session.scheduled_at <= cutoff,
        )
        .values(status=SessionStatus.COMPLETED)
        .execution_options(synchronize_session=False)
    )
    if result.rowcount:
        db.commit()


def create_session(db: Session, tutor: User, payload: SessionCreate) -> SessionPublic:
    """Create a session owned by a tutor."""
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede crear sesiones.")

    tutorando_ids = payload.tutorando_ids or []

    # Validate tutorandos only for personalized scope
    valid_tutorando_ids: list[UUID] = []
    if payload.scope == SessionScope.PERSONALIZADA:
        if not tutorando_ids:
            raise SessionServiceError("Debe seleccionar al menos un tutorado para una sesión personalizada.")
        assignments = db.scalars(
            select(TutorAssignment.tutorando_id).where(
                TutorAssignment.tutor_id == tutor.id,
                TutorAssignment.active.is_(True),
                TutorAssignment.tutorando_id.in_(tutorando_ids),
            )
        ).all()
        valid_tutorando_ids = list(assignments)
        if len(valid_tutorando_ids) != len(set(tutorando_ids)):
            raise UnauthorizedError("Solo puedes invitar tutorados que tengas asignados.")
    else:
        valid_tutorando_ids = []

    session = Session(
        tutor_id=tutor.id,
        tutorando_id=None,
        title=payload.title,
        description=payload.description,
        scheduled_at=payload.scheduled_at,
        meeting_link=payload.meeting_link,
        status=SessionStatus.SCHEDULED,
        scope=payload.scope,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    if valid_tutorando_ids:
        invites = [SessionInvite(session_id=session.id, tutorando_id=t_id) for t_id in valid_tutorando_ids]
        db.add_all(invites)
        db.commit()
        db.refresh(session)

    recipient_ids: list[UUID] = []
    if payload.scope == SessionScope.PERSONALIZADA:
        recipient_ids = valid_tutorando_ids
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
    if recipient_ids:
        emails = db.scalars(select(Profile.email).where(Profile.user_id.in_(recipient_ids))).all()
        recipients = sorted({email for email in emails if email})
        if recipients:
            body = (
                f"Se ha programado una nueva sesión.\n\n"
                f"Título: {payload.title}\n"
                f"Fecha y hora: {payload.scheduled_at}\n"
                f"Descripción: {payload.description or 'Sin descripción'}\n"
                f"Enlace: {session.meeting_link or 'Por confirmar'}\n"
            )
            send_email("Nueva sesión de tutoría", body, recipients)
    return build_session_public(session)


def list_sessions_for_tutor(db: Session, tutor: User) -> list[SessionPublic]:
    """List all sessions created by a tutor."""
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede listar sus sesiones.")

    _auto_complete_sessions(db, [tutor.id])
    sessions = (
        db.scalars(
            select(Session)
            .options(
                selectinload(Session.tutor),
                selectinload(Session.tutorando).selectinload(User.profile),
                selectinload(Session.invites).selectinload(SessionInvite.tutorando).selectinload(User.profile),
            )
            .where(Session.tutor_id == tutor.id)
            .order_by(Session.scheduled_at.desc())
        ).all()
    )
    return [build_session_public(session) for session in sessions]


def update_session(db: Session, tutor: User, session_id: UUID, payload: SessionUpdateRequest) -> SessionPublic:
    """Update status or schedule of a session owned by the tutor."""
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede actualizar sus sesiones.")

    session = (
        db.query(Session)
        .options(
            selectinload(Session.tutor),
            selectinload(Session.tutorando).selectinload(User.profile),
            selectinload(Session.invites).selectinload(SessionInvite.tutorando).selectinload(User.profile),
        )
        .filter(Session.id == session_id, Session.tutor_id == tutor.id)
        .first()
    )
    if session is None:
        raise NotFoundError("Sesión no encontrada.")

    previous_date = session.scheduled_at

    if payload.status is not None:
        session.status = payload.status
    if payload.scheduled_at is not None:
        session.scheduled_at = payload.scheduled_at
        if payload.status is None and session.status in {SessionStatus.COMPLETED, SessionStatus.CANCELED}:
            session.status = SessionStatus.SCHEDULED
    if payload.meeting_link is not None:
        session.meeting_link = payload.meeting_link

    db.commit()
    db.refresh(session)

    if payload.scheduled_at is not None and session.scheduled_at != previous_date:
        if session.scope == SessionScope.PERSONALIZADA:
            recipient_ids = [inv.tutorando_id for inv in session.invites]
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
        if recipient_ids:
            emails = db.scalars(select(Profile.email).where(Profile.user_id.in_(recipient_ids))).all()
            recipients = sorted({email for email in emails if email})
            if recipients:
                body = (
                    "La sesión fue reprogramada.\n\n"
                    f"Título: {session.title}\n"
                    f"Fecha anterior: {previous_date}\n"
                    f"Nueva fecha: {session.scheduled_at}\n"
                    f"Enlace: {session.meeting_link or 'Por confirmar'}\n"
                )
                send_email("Sesión reprogramada", body, recipients)
    return build_session_public(session)


def delete_session(db: Session, tutor: User, session_id: UUID) -> None:
    """Delete a session owned by the tutor."""
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede eliminar sesiones.")

    session = db.query(Session).filter(Session.id == session_id, Session.tutor_id == tutor.id).first()
    if session is None:
        raise NotFoundError("Sesión no encontrada.")

    db.delete(session)
    db.commit()


def list_sessions_for_tutorando(db: Session, tutorando: User) -> list[SessionPublic]:
    """List sessions assigned to a tutorando."""
    if tutorando.role != UserRole.TUTORANDO:
        raise UnauthorizedError("Solo un tutorado puede ver sus sesiones.")

    # Tutores asignados al tutorando
    tutor_ids = [
        assignment.tutor_id
        for assignment in db.scalars(
            select(TutorAssignment).where(
                TutorAssignment.tutorando_id == tutorando.id,
                TutorAssignment.active.is_(True),
            )
        ).all()
    ]

    _auto_complete_sessions(db, tutor_ids)
    sessions = (
        db.scalars(
            select(Session)
            .options(
                selectinload(Session.tutor),
                selectinload(Session.tutorando).selectinload(User.profile),
                selectinload(Session.invites).selectinload(SessionInvite.tutorando).selectinload(User.profile),
            )
            .where(
                or_(
                    # Sesiones generales de tutores asignados
                    Session.scope == SessionScope.GENERAL,
                    # Sesiones personalizadas donde está invitado
                    Session.id.in_(
                        select(SessionInvite.session_id).where(SessionInvite.tutorando_id == tutorando.id)
                    ),
                    # Compatibilidad: sesiones antiguas con tutorando_id
                    Session.tutorando_id == tutorando.id,
                ),
                Session.tutor_id.in_(tutor_ids),
            )
            .order_by(Session.scheduled_at.desc())
        )
        .all()
    )
    return [build_session_public(session) for session in sessions]


def list_all_sessions_for_admin(db: Session) -> list[SessionPublic]:
    """List all sessions in the system (admin only)."""
    sessions = (
        db.scalars(
            select(Session)
            .options(
                selectinload(Session.tutor).selectinload(User.profile),
                selectinload(Session.tutorando).selectinload(User.profile),
                selectinload(Session.invites).selectinload(SessionInvite.tutorando).selectinload(User.profile),
            )
            .order_by(Session.scheduled_at.desc())
        )
        .all()
    )
    return [build_session_public(session) for session in sessions]


def _get_participants(db: Session, session: Session) -> list[User]:
    """
    Get all participants (tutor + tutorandos) for a session.
    Returns User objects with profile/email loaded.
    """
    participants: list[User] = []

    # Add tutor
    if session.tutor and session.tutor.profile:
        participants.append(session.tutor)

    # Add tutorandos based on session scope
    if session.scope == SessionScope.PERSONALIZADA:
        # Personalized sessions: only invited tutorandos
        for invite in session.invites:
            if invite.tutorando and invite.tutorando.profile:
                participants.append(invite.tutorando)
    else:
        # General sessions: all active tutorandos assigned to the tutor
        tutorando_ids = [
            assignment.tutorando_id
            for assignment in db.scalars(
                select(TutorAssignment).where(
                    TutorAssignment.tutor_id == session.tutor_id,
                    TutorAssignment.active.is_(True),
                )
            ).all()
        ]

        if tutorando_ids:
            tutorandos = db.scalars(
                select(User)
                .options(selectinload(User.profile))
                .where(User.id.in_(tutorando_ids))
            ).all()
            participants.extend(tutorandos)

    return participants


def send_session_reminders(db: Session) -> int:
    """
    Send email reminders for sessions starting in 15 minutes.
    Called by the scheduler every minute.
    Returns the number of reminders sent.
    """
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    # Buscar sesiones que inicien entre 14 y 16 minutos desde ahora
    reminder_window_start = now + timedelta(minutes=14)
    reminder_window_end = now + timedelta(minutes=16)

    sessions_to_remind = (
        db.query(Session)
        .options(
            selectinload(Session.tutor).selectinload(User.profile),
            selectinload(Session.tutorando).selectinload(User.profile),
            selectinload(Session.invites).selectinload(SessionInvite.tutorando).selectinload(User.profile),
        )
        .filter(
            Session.status == SessionStatus.SCHEDULED,
            Session.reminder_sent == False,  # noqa: E712
            Session.scheduled_at >= reminder_window_start,
            Session.scheduled_at <= reminder_window_end,
        )
        .all()
    )

    reminders_sent = 0
    for session in sessions_to_remind:
        try:
            # Obtener participantes
            participants = _get_participants(db, session)
            recipients = [user.profile.email for user in participants if user.profile and user.profile.email]

            if recipients:
                # Preparar el correo de recordatorio
                scheduled_time = session.scheduled_at.strftime("%Y-%m-%d %H:%M")
                body = (
                    f"🔔 RECORDATORIO: La sesión '{session.title}' comenzará en 15 minutos.\n\n"
                    f"Fecha y hora: {scheduled_time}\n"
                    f"Descripción: {session.description or 'Sin descripción'}\n"
                    f"Enlace: {session.meeting_link or 'Por confirmar'}\n\n"
                    f"¡No olvides asistir!\n"
                )
                send_email(f"⏰ Recordatorio: {session.title}", body, recipients)

                # Marcar como recordatorio enviado
                session.reminder_sent = True
                db.commit()
                reminders_sent += 1
        except Exception as exc:  # noqa: BLE001
            # Log error but continue with other sessions
            import logging
            logging.error(f"Error sending reminder for session {session.id}: {exc}")
            db.rollback()

    return reminders_sent
