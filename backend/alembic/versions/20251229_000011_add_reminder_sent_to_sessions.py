"""Add reminder_sent field to sessions table."""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251229_000011"
down_revision = "20250612_000010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("reminder_sent", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("sessions", "reminder_sent")
