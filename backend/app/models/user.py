"""Database models for users and related entities."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    """Application roles."""

    ADMIN = "ADMIN"
    TUTOR = "TUTOR"
    TUTORANDO = "TUTORANDO"


class Gender(str, enum.Enum):
    """Gender options allowed in the platform."""

    MASCULINO = "MASCULINO"
    FEMENINO = "FEMENINO"
    OTRO = "OTRO"


class User(Base):
    """Authentication entity shared across all roles."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dni: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    profile: Mapped["Profile"] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    tutor_assignments: Mapped[list["TutorAssignment"]] = relationship(
        back_populates="tutor",
        foreign_keys="TutorAssignment.tutor_id",
    )
    tutorando_assignments: Mapped[list["TutorAssignment"]] = relationship(
        back_populates="tutorando",
        foreign_keys="TutorAssignment.tutorando_id",
    )


class Profile(Base):
    """Personal, academic and location data for a user."""

    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name_father: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name_mother: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    gender: Mapped[Gender] = mapped_column(Enum(Gender), nullable=False)
    phone: Mapped[str] = mapped_column(String(9), nullable=False)
    birthdate: Mapped[date] = mapped_column(Date, nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    faculty: Mapped[str] = mapped_column(String(150), nullable=False)
    school: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(120), nullable=False)
    province: Mapped[str] = mapped_column(String(120), nullable=False)
    district: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="profile")
    tutor_profile: Mapped["TutorProfile"] = relationship(
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )
    tutorando_profile: Mapped["TutorandoProfile"] = relationship(
        back_populates="profile",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TutorProfile(Base):
    """Extension data for tutors."""

    __tablename__ = "tutor_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    profile: Mapped["Profile"] = relationship(back_populates="tutor_profile")


class TutorandoProfile(Base):
    """Extension data for tutorandos."""

    __tablename__ = "tutorando_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    enrollment_code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)

    profile: Mapped["Profile"] = relationship(back_populates="tutorando_profile")


class TutorAssignment(Base):
    """Association table linking tutors with their tutorandos."""

    __tablename__ = "tutor_assignments"
    __table_args__ = (
        UniqueConstraint("tutor_id", "tutorando_id", name="uq_tutor_tutorando_pair"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    tutor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    tutorando_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tutor: Mapped["User"] = relationship(
        back_populates="tutor_assignments",
        foreign_keys=[tutor_id],
    )
    tutorando: Mapped["User"] = relationship(
        back_populates="tutorando_assignments",
        foreign_keys=[tutorando_id],
    )
