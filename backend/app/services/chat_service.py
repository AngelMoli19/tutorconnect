"""Service layer for chat threads and messages."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session, selectinload

from app.models.chat import ChatMessage, ChatThread
from app.models.user import TutorAssignment, User, UserRole
from app.schemas.chat import ChatMessageCreate, ChatMessagePublic, ChatThreadKind, ChatThreadPublic
from app.schemas.user import build_admin_user_public


class ChatServiceError(Exception):
    """Base chat service error."""


class UnauthorizedError(ChatServiceError):
    """Raised when user lacks permissions."""


class NotFoundError(ChatServiceError):
    """Raised when record not found."""


def _ensure_assignment(db: Session, tutor_id: UUID, tutorando_id: UUID) -> None:
    assignment = db.scalar(
        select(TutorAssignment).where(
            TutorAssignment.tutor_id == tutor_id,
            TutorAssignment.tutorando_id == tutorando_id,
            TutorAssignment.active.is_(True),
        )
    )
    if not assignment:
        raise UnauthorizedError("No existe asignacion activa entre tutor y tutorado.")


def _has_assignment(db: Session, tutor_id: UUID, tutorando_id: UUID) -> bool:
    return (
        db.scalar(
            select(TutorAssignment).where(
                TutorAssignment.tutor_id == tutor_id,
                TutorAssignment.tutorando_id == tutorando_id,
                TutorAssignment.active.is_(True),
            )
        )
        is not None
    )


def _is_group_thread(thread: ChatThread) -> bool:
    return bool(thread.group_key)


def _is_member(db: Session, user: User, thread: ChatThread) -> bool:
    if _is_group_thread(thread):
        if user.role == UserRole.TUTOR:
            return thread.tutor_id == user.id
        if user.role == UserRole.TUTORANDO:
            return _has_assignment(db, thread.tutor_id, user.id)
        return False
    return (user.role == UserRole.TUTOR and thread.tutor_id == user.id) or (
        user.role == UserRole.TUTORANDO and thread.tutorando_id == user.id
    )


def _message_summary(message: ChatMessage | None) -> str | None:
    if message is None:
        return None
    body = (message.body or "").strip()
    if body:
        return body
    if message.attachment_type == "LINK":
        return "Enlace compartido"
    if message.attachment_type == "IMAGE":
        return "Imagen compartida"
    if message.attachment_type:
        return "Archivo adjunto"
    return None


def get_or_create_group_thread(db: Session, tutor_id: UUID) -> ChatThreadPublic:
    thread = db.scalar(
        select(ChatThread)
        .options(
            selectinload(ChatThread.tutor).selectinload(User.profile),
        )
        .where(ChatThread.tutor_id == tutor_id, ChatThread.group_key == "GENERAL")
    )
    if thread is None:
        thread = ChatThread(tutor_id=tutor_id, tutorando_id=None, group_key="GENERAL")
        db.add(thread)
        db.commit()
        db.refresh(thread)
    last_message = _get_last_message(db, thread.id)
    return _build_thread_public(thread, last_message)


def create_or_get_thread(db: Session, tutor_id: UUID, tutorando_id: UUID) -> ChatThreadPublic:
    _ensure_assignment(db, tutor_id, tutorando_id)
    thread = db.scalar(
        select(ChatThread)
        .options(
            selectinload(ChatThread.tutor).selectinload(User.profile),
            selectinload(ChatThread.tutorando).selectinload(User.profile),
        )
        .where(ChatThread.tutor_id == tutor_id, ChatThread.tutorando_id == tutorando_id, ChatThread.group_key.is_(None))
    )
    if thread is None:
        thread = ChatThread(tutor_id=tutor_id, tutorando_id=tutorando_id)
        db.add(thread)
        db.commit()
        db.refresh(thread)
    last_message = _get_last_message(db, thread.id)
    return _build_thread_public(thread, last_message)


def list_threads_for_tutor(db: Session, tutor: User) -> list[ChatThreadPublic]:
    if tutor.role != UserRole.TUTOR:
        raise UnauthorizedError("Solo un tutor puede ver chats.")

    group_thread = get_or_create_group_thread(db, tutor.id)
    threads = (
        db.scalars(
            select(ChatThread)
            .options(
                selectinload(ChatThread.tutor).selectinload(User.profile),
                selectinload(ChatThread.tutorando).selectinload(User.profile),
            )
            .where(ChatThread.tutor_id == tutor.id, ChatThread.group_key.is_(None))
            .order_by(ChatThread.created_at.desc())
        )
        .all()
    )
    direct_threads = [_build_thread_public(thread, _get_last_message(db, thread.id)) for thread in threads]
    return [group_thread, *direct_threads]


def list_threads_for_tutorando(db: Session, tutorando: User) -> list[ChatThreadPublic]:
    if tutorando.role != UserRole.TUTORANDO:
        raise UnauthorizedError("Solo un tutorado puede ver chats.")

    tutor_ids = [
        assignment.tutor_id
        for assignment in db.scalars(
            select(TutorAssignment).where(
                TutorAssignment.tutorando_id == tutorando.id,
                TutorAssignment.active.is_(True),
            )
        ).all()
    ]
    group_threads = [get_or_create_group_thread(db, tutor_id) for tutor_id in tutor_ids]
    threads = (
        db.scalars(
            select(ChatThread)
            .options(
                selectinload(ChatThread.tutor).selectinload(User.profile),
                selectinload(ChatThread.tutorando).selectinload(User.profile),
            )
            .where(ChatThread.tutorando_id == tutorando.id, ChatThread.group_key.is_(None))
            .order_by(ChatThread.created_at.desc())
        )
        .all()
    )
    direct_threads = [_build_thread_public(thread, _get_last_message(db, thread.id)) for thread in threads]
    combined = {thread.id: thread for thread in [*group_threads, *direct_threads]}
    return list(combined.values())


def list_messages(db: Session, user: User, thread_id: UUID) -> list[ChatMessagePublic]:
    thread = db.scalar(
        select(ChatThread)
        .options(
            selectinload(ChatThread.tutor),
            selectinload(ChatThread.tutorando),
        )
        .where(ChatThread.id == thread_id)
    )
    if thread is None:
        raise NotFoundError("Chat no encontrado.")
    if not _is_member(db, user, thread):
        raise UnauthorizedError("No tienes acceso a este chat.")

    messages = (
        db.scalars(
            select(ChatMessage)
            .options(
                selectinload(ChatMessage.sender).selectinload(User.profile),
                selectinload(ChatMessage.reply_to).selectinload(ChatMessage.sender).selectinload(User.profile),
            )
            .where(ChatMessage.thread_id == thread_id)
            .order_by(ChatMessage.created_at.asc())
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    unread_ids = [msg.id for msg in messages if msg.sender_id != user.id and msg.read_at is None]
    if unread_ids:
        db.execute(
            update(ChatMessage)
            .where(ChatMessage.id.in_(unread_ids))
            .values(read_at=now)
        )
        db.commit()
        for msg in messages:
            if msg.id in unread_ids:
                msg.read_at = now
    return [_build_message_public(msg, user) for msg in messages]


def send_message(db: Session, user: User, thread_id: UUID, payload: ChatMessageCreate) -> ChatMessagePublic:
    thread = db.scalar(select(ChatThread).where(ChatThread.id == thread_id))
    if thread is None:
        raise NotFoundError("Chat no encontrado.")
    if not _is_member(db, user, thread):
        raise UnauthorizedError("No tienes acceso a este chat.")

    reply_to = None
    if payload.reply_to_id:
        reply_to = db.scalar(
            select(ChatMessage).where(ChatMessage.id == payload.reply_to_id, ChatMessage.thread_id == thread_id)
        )
        if reply_to is None:
            raise NotFoundError("El mensaje citado no existe en este chat.")

    message = ChatMessage(
        thread_id=thread_id,
        sender_id=user.id,
        body=payload.body or "",
        attachment_url=payload.link_url,
        attachment_type="LINK" if payload.link_url else None,
        reply_to_id=reply_to.id if reply_to else None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _build_message_public(message, user)


def send_message_with_upload(
    db: Session,
    user: User,
    thread_id: UUID,
    body: str | None,
    filename: str,
    mime_type: str | None,
    file_bytes: bytes,
    reply_to_id: UUID | None,
) -> ChatMessagePublic:
    thread = db.scalar(select(ChatThread).where(ChatThread.id == thread_id))
    if thread is None:
        raise NotFoundError("Chat no encontrado.")
    if not _is_member(db, user, thread):
        raise UnauthorizedError("No tienes acceso a este chat.")

    reply_to = None
    if reply_to_id:
        reply_to = db.scalar(
            select(ChatMessage).where(ChatMessage.id == reply_to_id, ChatMessage.thread_id == thread_id)
        )
        if reply_to is None:
            raise NotFoundError("El mensaje citado no existe en este chat.")

    safe_body = (body or "").strip()
    attachment_url, attachment_name, attachment_type = _store_attachment(filename, mime_type, file_bytes)
    message = ChatMessage(
        thread_id=thread_id,
        sender_id=user.id,
        body=safe_body,
        attachment_url=attachment_url,
        attachment_name=attachment_name,
        attachment_type=attachment_type,
        reply_to_id=reply_to.id if reply_to else None,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _build_message_public(message, user)


def set_typing_status(db: Session, user: User, thread_id: UUID, is_typing: bool) -> ChatThreadPublic:
    thread = db.scalar(
        select(ChatThread)
        .options(
            selectinload(ChatThread.tutor).selectinload(User.profile),
            selectinload(ChatThread.tutorando).selectinload(User.profile),
        )
        .where(ChatThread.id == thread_id)
    )
    if thread is None:
        raise NotFoundError("Chat no encontrado.")
    if not _is_member(db, user, thread):
        raise UnauthorizedError("No tienes acceso a este chat.")

    now = datetime.now(timezone.utc)
    if user.role == UserRole.TUTOR:
        thread.tutor_typing_at = now if is_typing else None
    else:
        thread.tutorando_typing_at = now if is_typing else None
    db.commit()
    db.refresh(thread)
    return _build_thread_public(thread, _get_last_message(db, thread.id))


def _get_last_message(db: Session, thread_id: UUID) -> ChatMessage | None:
    return db.scalar(
        select(ChatMessage).where(ChatMessage.thread_id == thread_id).order_by(ChatMessage.created_at.desc())
    )


def _build_thread_public(thread: ChatThread, last_message: ChatMessage | None) -> ChatThreadPublic:
    kind = ChatThreadKind.GROUP if _is_group_thread(thread) else ChatThreadKind.DIRECT
    title = "Chat general" if kind == ChatThreadKind.GROUP else None
    return ChatThreadPublic.model_validate(
        {
            "id": thread.id,
            "tutor": build_admin_user_public(thread.tutor),
            "tutorando": build_admin_user_public(thread.tutorando) if thread.tutorando else None,
            "last_message": _message_summary(last_message),
            "last_message_at": last_message.created_at if last_message else None,
            "kind": kind,
            "title": title,
            "tutor_typing_at": thread.tutor_typing_at,
            "tutorando_typing_at": thread.tutorando_typing_at,
        }
    )


def _build_message_public(message: ChatMessage, current_user: User) -> ChatMessagePublic:
    reply = None
    if message.reply_to:
        reply = {
            "id": message.reply_to.id,
            "body": message.reply_to.body,
            "attachment_url": message.reply_to.attachment_url,
            "attachment_name": message.reply_to.attachment_name,
            "attachment_type": message.reply_to.attachment_type,
            "sender": build_admin_user_public(message.reply_to.sender),
        }
    return ChatMessagePublic.model_validate(
        {
            "id": message.id,
            "body": message.body,
            "created_at": message.created_at,
            "from_me": message.sender_id == current_user.id,
            "sender_role": message.sender.role,
            "sender": build_admin_user_public(message.sender),
            "read_at": message.read_at,
            "attachment_url": message.attachment_url,
            "attachment_name": message.attachment_name,
            "attachment_type": message.attachment_type,
            "reply_to": reply,
        }
    )


def _store_attachment(filename: str, mime_type: str | None, file_bytes: bytes) -> tuple[str, str, str]:
    from pathlib import Path
    import re
    import uuid

    from app.core.config import get_settings

    def sanitize(name: str) -> str:
        clean = Path(name).name
        clean = clean.replace(" ", "_")
        clean = re.sub(r"[^A-Za-z0-9._-]", "", clean)
        return clean or "archivo"

    safe_name = sanitize(filename)
    settings = get_settings()
    base_dir = Path(settings.uploads_dir)
    if not base_dir.is_absolute():
        base_dir = Path(__file__).resolve().parents[2] / settings.uploads_dir
    chat_dir = base_dir / "chat"
    chat_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4()}_{safe_name}"
    stored_path = chat_dir / stored_name
    stored_path.write_bytes(file_bytes)
    url = f"/uploads/chat/{stored_name}"

    ext = Path(safe_name).suffix.lower()
    attachment_type = "FILE"
    if mime_type and mime_type.startswith("image/"):
        attachment_type = "IMAGE"
    elif ext in {".pdf"}:
        attachment_type = "DOCUMENT"
    return url, safe_name, attachment_type
