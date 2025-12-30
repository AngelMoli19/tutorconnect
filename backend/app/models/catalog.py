"""Database models for academic catalogs (faculties and schools)."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Faculty(Base):
    """Represents a faculty."""

    __tablename__ = "faculties"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)

    schools: Mapped[list["School"]] = relationship(
        back_populates="faculty",
        cascade="all, delete-orphan",
    )


class School(Base):
    """Represents a professional school belonging to a faculty."""

    __tablename__ = "schools"
    __table_args__ = (
        UniqueConstraint("faculty_id", "name", name="uq_school_name_per_faculty"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    faculty_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("faculties.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)

    faculty: Mapped["Faculty"] = relationship(back_populates="schools")
