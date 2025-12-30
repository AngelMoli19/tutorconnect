"""Admin-facing API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin
from app.db.session import get_db
from app.models.user import UserRole
from app.schemas.assignment import (
    AssignmentCreateRequest,
    AssignmentResponse,
    build_assignment_tutorandos,
)
from app.schemas.attendance import AttendancePublic
from app.schemas.observation import ObservationPublic
from app.schemas.session import SessionPublic
from app.schemas.user import (
    AdminUserPublic,
    TutorCreateRequest,
    TutorUpdateRequest,
    TutorandoCreateRequest,
    TutorandoUpdateRequest,
    build_admin_user_list,
    build_admin_user_public,
)
from app.services.attendance_service import (
    NotFoundError as AttendanceNotFoundError,
    list_attendance_for_session_admin,
)
from app.services.observation_service import list_all_observations_for_admin
from app.services.session_service import list_all_sessions_for_admin
from app.services.user_service import (
    AssignmentError,
    AssignmentNotFoundError,
    DuplicateDniError,
    DuplicateEnrollmentError,
    InvalidRoleError,
    UserNotFoundError,
    UserServiceError,
    assign_tutorandos,
    create_tutor,
    create_tutorando,
    dashboard_metrics,
    deactivate_assignment,
    deactivate_user,
    get_tutor_assignments,
    list_users,
    update_tutor,
    update_tutorando,
)

router = APIRouter()


@router.get("/profile", response_model=AdminUserPublic)
def get_admin_profile(current_admin=Depends(get_current_admin)) -> AdminUserPublic:
    """Return the admin profile for the authenticated admin."""
    return build_admin_user_public(current_admin)


@router.get("/health")
async def admin_healthcheck() -> dict[str, str]:
    """Basic endpoint to verify admin router wiring."""
    return {"status": "ok"}


@router.get("/dashboard")
def get_dashboard_metrics(
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Return simple aggregated metrics for the admin dashboard."""
    metrics = dashboard_metrics(db)
    return metrics.to_dict()


@router.get(
    "/users",
    response_model=list[AdminUserPublic],
)
def list_users_endpoint(
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
    role: UserRole | None = Query(default=None),
) -> list[AdminUserPublic]:
    """List users filtered by role."""
    users = list_users(db, role)
    return build_admin_user_list(users)


@router.post(
    "/tutors",
    status_code=status.HTTP_201_CREATED,
    response_model=AdminUserPublic,
)
def create_tutor_endpoint(
    payload: TutorCreateRequest,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserPublic:
    """Register a new tutor."""
    try:
        user = create_tutor(db, payload)
    except DuplicateDniError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except UserServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return build_admin_user_public(user)


@router.put(
    "/tutors/{user_id}",
    response_model=AdminUserPublic,
)
def update_tutor_endpoint(
    user_id: UUID,
    payload: TutorUpdateRequest,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserPublic:
    """Update an existing tutor profile."""
    try:
        user = update_tutor(db, user_id, payload)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except DuplicateDniError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except InvalidRoleError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except UserServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return build_admin_user_public(user)


@router.post(
    "/tutorandos",
    status_code=status.HTTP_201_CREATED,
    response_model=AdminUserPublic,
)
def create_tutorando_endpoint(
    payload: TutorandoCreateRequest,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserPublic:
    """Register a new tutorando."""
    try:
        user = create_tutorando(db, payload)
    except DuplicateDniError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except DuplicateEnrollmentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except UserServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return build_admin_user_public(user)


@router.put(
    "/tutorandos/{user_id}",
    response_model=AdminUserPublic,
)
def update_tutorando_endpoint(
    user_id: UUID,
    payload: TutorandoUpdateRequest,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserPublic:
    """Update an existing tutorando profile."""
    try:
        user = update_tutorando(db, user_id, payload)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except (DuplicateDniError, DuplicateEnrollmentError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except InvalidRoleError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except UserServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return build_admin_user_public(user)


@router.delete(
    "/users/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def deactivate_user_endpoint(
    user_id: UUID,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> Response:
    """Soft delete a user."""
    try:
        deactivate_user(db, user_id)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/assignments",
    status_code=status.HTTP_201_CREATED,
    response_model=AssignmentResponse,
)
def assign_tutorandos_endpoint(
    payload: AssignmentCreateRequest,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AssignmentResponse:
    """Assign tutorandos to a tutor."""
    try:
        tutor, assignments = assign_tutorandos(db, payload.tutor_id, payload.tutorando_ids)
    except (UserNotFoundError, InvalidRoleError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AssignmentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AssignmentResponse(
        tutor=build_admin_user_public(tutor),
        tutorandos=build_assignment_tutorandos(assignments),
    )


@router.get(
    "/assignments/{tutor_id}",
    response_model=AssignmentResponse,
)
def get_assignments_endpoint(
    tutor_id: UUID,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
    include_inactive: bool = Query(default=False),
) -> AssignmentResponse:
    """Retrieve existing tutor-tutorando assignments."""
    try:
        tutor, assignments = get_tutor_assignments(db, tutor_id, include_inactive=include_inactive)
    except UserNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except InvalidRoleError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AssignmentResponse(
        tutor=build_admin_user_public(tutor),
        tutorandos=build_assignment_tutorandos(assignments),
    )


@router.delete(
    "/assignments/{assignment_id}",
    response_model=AssignmentResponse,
)
def deactivate_assignment_endpoint(
    assignment_id: UUID,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
    include_inactive: bool = Query(default=False),
) -> AssignmentResponse:
    """Deactivate a tutorando assignment from a tutor."""
    try:
        tutor, assignments = deactivate_assignment(db, assignment_id, include_inactive=include_inactive)
    except AssignmentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except AssignmentError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return AssignmentResponse(
        tutor=build_admin_user_public(tutor),
        tutorandos=build_assignment_tutorandos(assignments),
    )


@router.get("/sessions", response_model=list[SessionPublic])
def get_all_sessions(
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[SessionPublic]:
    """Get all sessions in the system."""
    return list_all_sessions_for_admin(db)


@router.get("/sessions/{session_id}/attendance", response_model=list[AttendancePublic])
def get_session_attendance_admin(
    session_id: UUID,
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[AttendancePublic]:
    """Get attendance for a specific session."""
    try:
        return list_attendance_for_session_admin(db, session_id)
    except AttendanceNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/observations", response_model=list[ObservationPublic])
def get_all_observations(
    _: None = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> list[ObservationPublic]:
    """Get all observations in the system."""
    return list_all_observations_for_admin(db)
