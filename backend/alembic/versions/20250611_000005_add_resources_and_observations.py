"""Add resources and observations tables."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250611_000005"
down_revision = "20250611_000004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    resource_type_enum = postgresql.ENUM(
        "LINK",
        "FILE",
        "VIDEO",
        "DOCUMENT",
        "PRESENTATION",
        "OTHER",
        name="resourcetype",
        create_type=False,
    )
    resource_scope_enum = postgresql.ENUM("GENERAL", "PERSONALIZADA", name="resourcescope", create_type=False)
    observation_category_enum = postgresql.ENUM(
        "ACADEMICA",
        "EMOCIONAL",
        "GENERAL",
        name="observationcategory",
        create_type=False,
    )

    resource_type_enum.create(op.get_bind(), checkfirst=True)
    resource_scope_enum.create(op.get_bind(), checkfirst=True)
    observation_category_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tutor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("resource_type", resource_type_enum, nullable=False),
        sa.Column("url", sa.String(length=500), nullable=False),
        sa.Column("scope", resource_scope_enum, nullable=False, server_default="GENERAL"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.alter_column("resources", "scope", server_default=None)

    op.create_table(
        "resource_invites",
        sa.Column("resource_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("resources.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tutorando_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "observations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tutor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tutorando_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category", observation_category_enum, nullable=False),
        sa.Column("summary", sa.String(length=200), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("observations")
    op.drop_table("resource_invites")
    op.drop_table("resources")

    observation_category_enum = postgresql.ENUM("ACADEMICA", "EMOCIONAL", "GENERAL", name="observationcategory")
    resource_scope_enum = postgresql.ENUM("GENERAL", "PERSONALIZADA", name="resourcescope")
    resource_type_enum = postgresql.ENUM("LINK", "FILE", "VIDEO", "DOCUMENT", "PRESENTATION", "OTHER", name="resourcetype")

    observation_category_enum.drop(op.get_bind(), checkfirst=True)
    resource_scope_enum.drop(op.get_bind(), checkfirst=True)
    resource_type_enum.drop(op.get_bind(), checkfirst=True)
