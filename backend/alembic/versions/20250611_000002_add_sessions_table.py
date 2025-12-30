"""add sessions table"""

from __future__ import annotations

import uuid
from datetime import datetime

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20250611_000002"
down_revision = "20250611_000001"
branch_labels = None
depends_on = None

session_status_enum = sa.Enum("SCHEDULED", "COMPLETED", "CANCELED", name="sessionstatus")


def upgrade() -> None:
    # Assume enum exists or will be created implicitly; avoid duplicate creation errors
    session_status_enum.create_type = False

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False),
        sa.Column("tutor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tutorando_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("meeting_link", sa.String(length=255), nullable=True),
        sa.Column("status", session_status_enum, nullable=False, server_default="SCHEDULED"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("sessions")
    bind = op.get_bind()
    session_status_enum.drop(bind, checkfirst=True)
