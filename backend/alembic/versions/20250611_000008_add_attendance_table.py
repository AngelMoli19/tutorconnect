"""Add session attendance table."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250611_000008"
down_revision = "20250611_000007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    attendance_status = postgresql.ENUM(
        "PRESENT",
        "ABSENT",
        "JUSTIFIED",
        name="attendancestatus",
        create_type=False,
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendancestatus') THEN
                CREATE TYPE attendancestatus AS ENUM ('PRESENT', 'ABSENT', 'JUSTIFIED');
            END IF;
        END$$;
        """
    )

    op.create_table(
        "session_attendance",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sessions.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("tutorando_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("status", attendance_status, nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("session_attendance")
    op.execute("DROP TYPE IF EXISTS attendancestatus")
