"""Add chat enhancements for typing, attachments, and group threads."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20250611_000007"
down_revision = "20250611_000006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_threads", sa.Column("group_key", sa.String(length=32), nullable=True))
    op.add_column("chat_threads", sa.Column("tutor_typing_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("chat_threads", sa.Column("tutorando_typing_at", sa.DateTime(timezone=True), nullable=True))
    op.alter_column(
        "chat_threads",
        "tutorando_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )
    op.create_unique_constraint("uq_chat_thread_group", "chat_threads", ["tutor_id", "group_key"])

    op.add_column("chat_messages", sa.Column("attachment_url", sa.Text(), nullable=True))
    op.add_column("chat_messages", sa.Column("attachment_name", sa.String(length=255), nullable=True))
    op.add_column("chat_messages", sa.Column("attachment_type", sa.String(length=32), nullable=True))
    op.add_column("chat_messages", sa.Column("reply_to_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_chat_messages_reply",
        "chat_messages",
        "chat_messages",
        ["reply_to_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_chat_messages_reply", "chat_messages", type_="foreignkey")
    op.drop_column("chat_messages", "reply_to_id")
    op.drop_column("chat_messages", "attachment_type")
    op.drop_column("chat_messages", "attachment_name")
    op.drop_column("chat_messages", "attachment_url")

    op.drop_constraint("uq_chat_thread_group", "chat_threads", type_="unique")
    op.alter_column(
        "chat_threads",
        "tutorando_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.drop_column("chat_threads", "tutorando_typing_at")
    op.drop_column("chat_threads", "tutor_typing_at")
    op.drop_column("chat_threads", "group_key")
