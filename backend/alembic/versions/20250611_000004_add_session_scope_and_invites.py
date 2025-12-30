"""Add session scope and invitations table."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250611_000004"
down_revision = "20250611_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    session_scope_enum = postgresql.ENUM("GENERAL", "PERSONALIZADA", name="sessionscope")
    session_scope_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "sessions",
        sa.Column(
            "scope",
            session_scope_enum,
            nullable=False,
            server_default="GENERAL",
        ),
    )
    op.alter_column("sessions", "scope", server_default=None)

    op.create_table(
        "session_invites",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tutorando_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("session_invites")
    op.drop_column("sessions", "scope")
    session_scope_enum = postgresql.ENUM("GENERAL", "PERSONALIZADA", name="sessionscope")
    session_scope_enum.drop(op.get_bind(), checkfirst=True)
