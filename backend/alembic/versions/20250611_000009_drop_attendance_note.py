"""Drop note column from session attendance."""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20250611_000009"
down_revision = "20250611_000008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("session_attendance", "note")


def downgrade() -> None:
    op.add_column("session_attendance", sa.Column("note", sa.Text(), nullable=True))
