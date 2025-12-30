"""create core tables and seed admin"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, date

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

from app.core.security import get_password_hash

revision = "20250611_000001"
down_revision = None
branch_labels = None
depends_on = None


USER_ROLE_ENUM = sa.Enum("ADMIN", "TUTOR", "TUTORANDO", name="userrole")
GENDER_ENUM = sa.Enum("MASCULINO", "FEMENINO", "OTRO", name="gender")


def upgrade() -> None:
    bind = op.get_bind()

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4),
        sa.Column("dni", sa.String(length=15), nullable=False, unique=True, index=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", USER_ROLE_ENUM, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name_father", sa.String(length=100), nullable=False),
        sa.Column("last_name_mother", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("gender", GENDER_ENUM, nullable=False),
        sa.Column("phone", sa.String(length=9), nullable=False),
        sa.Column("birthdate", sa.Date(), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("faculty", sa.String(length=150), nullable=False),
        sa.Column("school", sa.String(length=150), nullable=False),
        sa.Column("department", sa.String(length=120), nullable=False),
        sa.Column("province", sa.String(length=120), nullable=False),
        sa.Column("district", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )

    op.create_table(
        "tutor_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4),
        sa.Column(
            "profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
    )

    op.create_table(
        "tutorando_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4),
        sa.Column(
            "profile_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("enrollment_code", sa.String(length=30), nullable=False, unique=True),
    )

    op.create_table(
        "tutor_assignments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False, default=uuid.uuid4),
        sa.Column(
            "tutor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "tutorando_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("tutor_id", "tutorando_id", name="uq_tutor_tutorando_pair"),
    )

    seed_admin()


def downgrade() -> None:
    op.drop_table("tutor_assignments")
    op.drop_table("tutorando_profiles")
    op.drop_table("tutor_profiles")
    op.drop_table("profiles")
    op.drop_table("users")

    bind = op.get_bind()
    GENDER_ENUM.drop(bind, checkfirst=True)
    USER_ROLE_ENUM.drop(bind, checkfirst=True)


def seed_admin() -> None:
    admin_dni = os.getenv("ADMIN_DNI", "ADMIN001")
    admin_password = os.getenv("ADMIN_PASSWORD", "Admin123456")
    admin_first_name = os.getenv("ADMIN_FIRST_NAME", "Administrador")
    admin_last_name_father = os.getenv("ADMIN_LAST_NAME_FATHER", "Principal")
    admin_last_name_mother = os.getenv("ADMIN_LAST_NAME_MOTHER", "Sistema")
    admin_email = os.getenv("ADMIN_EMAIL", "admin@tutorconnect.edu")

    admin_user_id = uuid.uuid4()
    admin_profile_id = uuid.uuid4()

    password_hash = get_password_hash(admin_password)
    today = datetime.utcnow()

    users_table = sa.Table(
        "users",
        sa.MetaData(),
        sa.Column("id", postgresql.UUID(as_uuid=True)),
        sa.Column("dni", sa.String),
        sa.Column("password_hash", sa.String),
        sa.Column("role", USER_ROLE_ENUM),
        sa.Column("is_active", sa.Boolean),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    profiles_table = sa.Table(
        "profiles",
        sa.MetaData(),
        sa.Column("id", postgresql.UUID(as_uuid=True)),
        sa.Column("user_id", postgresql.UUID(as_uuid=True)),
        sa.Column("first_name", sa.String),
        sa.Column("last_name_father", sa.String),
        sa.Column("last_name_mother", sa.String),
        sa.Column("email", sa.String),
        sa.Column("gender", GENDER_ENUM),
        sa.Column("phone", sa.String),
        sa.Column("birthdate", sa.Date),
        sa.Column("address", sa.String),
        sa.Column("faculty", sa.String),
        sa.Column("school", sa.String),
        sa.Column("department", sa.String),
        sa.Column("province", sa.String),
        sa.Column("district", sa.String),
        sa.Column("created_at", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True)),
    )

    op.execute(
        users_table.insert().values(
            id=admin_user_id,
            dni=admin_dni,
            password_hash=password_hash,
            role="ADMIN",
            is_active=True,
            created_at=today,
            updated_at=today,
        )
    )

    op.execute(
        profiles_table.insert().values(
            id=admin_profile_id,
            user_id=admin_user_id,
            first_name=admin_first_name,
            last_name_father=admin_last_name_father,
            last_name_mother=admin_last_name_mother,
            email=admin_email,
            gender="MASCULINO",
            phone="900000000",
            birthdate=date(1990, 1, 1),
            address="Oficina de tutorias",
            faculty="Administracion",
            school="Gestion de Proyectos",
            department="Puno",
            province="Puno",
            district="Puno",
            created_at=today,
            updated_at=today,
        )
    )
