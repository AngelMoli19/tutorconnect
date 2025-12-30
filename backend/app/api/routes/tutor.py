"""Endpoints for tutor role actions."""

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.resource import ResourceScope
from app.models.user import TutorAssignment, User, UserRole
from app.schemas.chat import ChatMessageCreate, ChatMessagePublic, ChatThreadCreate, ChatThreadPublic, ChatTypingPayload
from app.schemas.attendance import AttendanceBatchUpdate, AttendancePublic
from app.schemas.observation import ObservationCreate, ObservationPublic
from app.schemas.resource import ResourceCreate, ResourcePublic
from app.schemas.session import SessionCreate, SessionPublic, SessionUpdateRequest
from app.schemas.user import AdminUserPublic, build_admin_user_public
from app.services.observation_service import (
    NotFoundError as ObservationNotFound,
    ObservationServiceError,
    UnauthorizedError as ObservationUnauthorized,
    create_observation,
    delete_observation,
    list_observations_for_tutor,
)
from app.services.attendance_service import (
    AttendanceServiceError,
    NotFoundError as AttendanceNotFound,
    UnauthorizedError as AttendanceUnauthorized,
    list_attendance_for_session,
    upsert_attendance,
)
from app.services.chat_service import (
    NotFoundError as ChatNotFound,
    UnauthorizedError as ChatUnauthorized,
    ChatServiceError,
    create_or_get_thread,
    list_messages,
    list_threads_for_tutor,
    send_message,
    send_message_with_upload,
    set_typing_status,
)
from app.services.resource_service import (
    NotFoundError as ResourceNotFound,
    ResourceServiceError,
    UnauthorizedError as ResourceUnauthorized,
    create_link_resource,
    create_upload_resource,
    delete_resource,
    list_resources_for_tutor,
)
from app.services.session_service import (
    NotFoundError,
    SessionServiceError,
    UnauthorizedError,
    create_session,
    list_sessions_for_tutor,
    update_session,
    delete_session,
)

router = APIRouter()


def _parse_tutorando_ids(raw: str | None) -> list[UUID]:
    if not raw:
        return []
    return [UUID(value.strip()) for value in raw.split(",") if value.strip()]


@router.get("/profile", response_model=AdminUserPublic)
def get_tutor_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AdminUserPublic:
    """Devuelve el perfil del tutor autenticado."""
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo disponible para tutores.")

    tutor = (
        db.query(User)
        .options(
            selectinload(User.profile),
        )
        .filter(User.id == current_user.id)
        .first()
    )
    if tutor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tutor no encontrado.")

    return build_admin_user_public(tutor)


@router.get("/sessions", response_model=list[SessionPublic])
def get_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionPublic]:
    """List sessions created by the current tutor."""
    try:
        return list_sessions_for_tutor(db, current_user)
    except UnauthorizedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/sessions", response_model=SessionPublic, status_code=status.HTTP_201_CREATED)
def create_session_endpoint(
    payload: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionPublic:
    """Create a tutoring session."""
    try:
        return create_session(db, current_user, payload)
    except UnauthorizedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/sessions/{session_id}", response_model=SessionPublic)
def update_session_endpoint(
    session_id: str,
    payload: SessionUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionPublic:
    """Update a session (status and/or reschedule)."""
    try:
        return update_session(db, current_user, session_id, payload)
    except UnauthorizedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a session owned by the tutor."""
    try:
        delete_session(db, current_user, session_id)
    except UnauthorizedError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except SessionServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/attendance", response_model=list[AttendancePublic])
def get_session_attendance(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AttendancePublic]:
    """List attendance entries for a session."""
    try:
        return list_attendance_for_session(db, current_user, session_id)
    except AttendanceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except AttendanceNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AttendanceServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/sessions/{session_id}/attendance", response_model=list[AttendancePublic])
def upsert_session_attendance(
    session_id: UUID,
    payload: AttendanceBatchUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AttendancePublic]:
    """Upsert attendance entries for a session."""
    try:
        return upsert_attendance(db, current_user, session_id, payload)
    except AttendanceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except AttendanceNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AttendanceServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/tutorandos", response_model=list[AdminUserPublic])
def get_assigned_tutorandos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AdminUserPublic]:
    """List tutorandos asignados al tutor actual."""
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo disponible para tutores.")

    assignments = (
        db.query(TutorAssignment)
        .options(
            selectinload(TutorAssignment.tutorando).selectinload(User.profile),
        )
        .filter(
            TutorAssignment.tutor_id == current_user.id,
            TutorAssignment.active.is_(True),
        )
        .all()
    )
    tutorandos = [build_admin_user_public(a.tutorando) for a in assignments if a.tutorando is not None]
    return tutorandos


@router.get("/resources", response_model=list[ResourcePublic])
def get_my_resources(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ResourcePublic]:
    """List resources created by the current tutor."""
    try:
        return list_resources_for_tutor(db, current_user)
    except ResourceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/resources", response_model=ResourcePublic, status_code=status.HTTP_201_CREATED)
def create_resource_link(
    payload: ResourceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourcePublic:
    """Create a link-based resource."""
    try:
        return create_link_resource(db, current_user, payload)
    except ResourceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/resources/upload", response_model=ResourcePublic, status_code=status.HTTP_201_CREATED)
def upload_resource_file(
    title: str = Form(...),
    description: str | None = Form(None),
    scope: ResourceScope = Form(ResourceScope.GENERAL),
    tutorando_ids: str | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResourcePublic:
    """Upload a file resource."""
    try:
        raw_ids = _parse_tutorando_ids(tutorando_ids)
        file_bytes = file.file.read()
        return create_upload_resource(
            db=db,
            tutor=current_user,
            title=title,
            description=description,
            scope=scope,
            tutorando_ids=raw_ids,
            filename=file.filename or "archivo",
            file_bytes=file_bytes,
            mime_type=file.content_type,
        )
    except ResourceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/resources/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_resource_endpoint(
    resource_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete a resource."""
    try:
        delete_resource(db, current_user, resource_id)
    except ResourceUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ResourceNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ResourceServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/observations", response_model=list[ObservationPublic])
def list_observations(
    tutorando_id: UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ObservationPublic]:
    """List observations created by the tutor."""
    try:
        return list_observations_for_tutor(db, current_user, tutorando_id)
    except ObservationUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/observations", response_model=ObservationPublic, status_code=status.HTTP_201_CREATED)
def create_observation_endpoint(
    payload: ObservationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ObservationPublic:
    """Create an observation."""
    try:
        return create_observation(db, current_user, payload)
    except ObservationUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ObservationNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ObservationServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/observations/{observation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_observation_endpoint(
    observation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    """Delete an observation."""
    try:
        delete_observation(db, current_user, observation_id)
    except ObservationUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ObservationNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ObservationServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/chats/threads", response_model=list[ChatThreadPublic])
def list_chat_threads(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ChatThreadPublic]:
    """List chat threads for the tutor."""
    try:
        return list_threads_for_tutor(db, current_user)
    except ChatUnauthorized as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post("/chats/threads", response_model=ChatThreadPublic)
def create_thread(
    payload: ChatThreadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatThreadPublic:
    """Create or get a thread with a tutorando."""
    if current_user.role != UserRole.TUTOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo disponible para tutores.")
    if not payload.tutorando_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tutorado requerido.")
    try:
        return create_or_get_thread(db, current_user.id, payload.tutorando_id)
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
