"""Endpoints orientados al tutorando."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import Profile, TutorAssignment, User, UserRole
from app.schemas.chat import ChatMessageCreate, ChatMessagePublic, ChatThreadCreate, ChatThreadPublic, ChatTypingPayload
from app.schemas.attendance import TutorandoAttendancePublic
from app.schemas.observation import ObservationPublic
from app.schemas.resource import ResourcePublic
from app.schemas.session import SessionPublic
from app.schemas.user import AdminUserPublic, build_admin_user_public
from app.services.chat_service import (
    NotFoundError as ChatNotFound,
    UnauthorizedError as ChatUnauthorized,
    ChatServiceError,
    create_or_get_thread,
    list_messages,
    list_threads_for_tutorando,
    send_message,
    send_message_with_upload,
    set_typing_status,
)
from app.services.observation_service import (
    UnauthorizedError as ObservationUnauthorized,
    list_observations_for_tutorando,
)
from app.services.resource_service import UnauthorizedError as ResourceUnauthorized, list_resources_for_tutorando
from app.services.session_service import UnauthorizedError, list_sessions_for_tutorando
from app.services.attendance_service import (
    UnauthorizedError as AttendanceUnauthorized,
    AttendanceServiceError,
    list_attendance_for_tutorando,
)

router = APIRouter()


@router.get("/profile", response_model=dict)
def get_tutorando_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Devuelve el perfil del tutorando, su tutor asignado y asignaciones activas."""
    if current_user.role != UserRole.TUTORANDO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo disponible para tutorados.",
        )

    tutorando = (
        db.query(User)
        .options(
            selectinload(User.profile).selectinload(Profile.tutorando_profile),
        )
        .filter(User.id == current_user.id)
        .first()
    )
    if tutorando is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutorado no encontrado.")

    assignments = (
        db.query(TutorAssignment)
        .options(
            selectinload(TutorAssignment.tutor).selectinload(User.profile),
        )
        .filter(
            TutorAssignment.tutorando_id == tutorando.id,
            TutorAssignment.active.is_(True),
        )
        .all()
    )

    assigned_tutor = assignments[0].tutor if assignments else None

    response: dict = {
        "tutorando": build_admin_user_public(tutorando),
        "assigned_tutor": build_admin_user_public(assigned_tutor) if assigned_tutor else None,
        "assignments_count": len(assignments),
    }
    return response


@router.get("/sessions", response_model=list[SessionPublic])
def get_tutorando_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionPublic]:
    """List sessions assigned to the current tutorando."""
    try:
        return list_sessions_for_tutorando(db, current_user)
    except UnauthorizedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/attendance", response_model=list[TutorandoAttendancePublic])
def get_tutorando_attendance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[TutorandoAttendancePublic]:
    """List attendance for the tutorando grouped by session."""
    try:
        return list_attendance_for_tutorando(db, current_user)
    except AttendanceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except AttendanceServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/resources", response_model=list[ResourcePublic])
def get_tutorando_resources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ResourcePublic]:
    """List resources available to the tutorando."""
    try:
        return list_resources_for_tutorando(db, current_user)
    except ResourceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/observations", response_model=list[ObservationPublic])
def get_tutorando_observations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ObservationPublic]:
    """List observations for the tutorando."""
    try:
        return list_observations_for_tutorando(db, current_user)
    except ObservationUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.get("/chats/threads", response_model=list[ChatThreadPublic])
def list_chat_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ChatThreadPublic]:
    """List chat threads for the tutorando."""
    try:
        return list_threads_for_tutorando(db, current_user)
    except ChatUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/chats/threads", response_model=ChatThreadPublic)
def create_thread(
    payload: ChatThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatThreadPublic:
    """Create or get a thread with a tutor."""
    if current_user.role != UserRole.TUTORANDO:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo disponible para tutorados.")
    if not payload.tutor_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tutor requerido.")
    try:
        return create_or_get_thread(db, payload.tutor_id, current_user.id)
    except ChatUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ChatServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/chats/threads/{thread_id}/messages", response_model=list[ChatMessagePublic])
def get_thread_messages(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ChatMessagePublic]:
    """List messages for a thread."""
    try:
        return list_messages(db, current_user, thread_id)
    except ChatUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ChatNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/chats/threads/{thread_id}/messages", response_model=ChatMessagePublic)
def post_thread_message(
    thread_id: UUID,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatMessagePublic:
    """Send a message in a thread."""
    try:
        return send_message(db, current_user, thread_id, payload)
    except ChatUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ChatNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ChatServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/chats/threads/{thread_id}/messages/upload", response_model=ChatMessagePublic)
def upload_chat_message(
    thread_id: UUID,
    file: UploadFile = File(...),
    body: str | None = Form(None),
    reply_to_id: UUID | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatMessagePublic:
    """Upload a chat attachment (file/image)."""
    try:
        file_bytes = file.file.read()
        return send_message_with_upload(
            db=db,
            user=current_user,
            thread_id=thread_id,
            body=body,
            filename=file.filename or "archivo",
            mime_type=file.content_type,
            file_bytes=file_bytes,
            reply_to_id=reply_to_id,
        )
    except ChatUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ChatNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ChatServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/chats/threads/{thread_id}/typing", response_model=ChatThreadPublic)
def set_typing(
    thread_id: UUID,
    payload: ChatTypingPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatThreadPublic:
    """Update typing indicator."""
    try:
        return set_typing_status(db, current_user, thread_id, payload.is_typing)
    except ChatUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ChatNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ChatServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
