"""add_activity_log_user_relation

Revision ID: 9b1f2a7c8d3e
Revises: d42841752e3d
Create Date: 2026-06-17 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "9b1f2a7c8d3e"
down_revision: Union[str, Sequence[str], None] = "d42841752e3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        UPDATE activity_logs
        SET user_id = NULL
        WHERE user_id IS NOT NULL
          AND user_id NOT IN (SELECT id FROM users)
        """
    )
    with op.batch_alter_table("activity_logs") as batch_op:
        batch_op.create_foreign_key(
            "fk_activity_logs_user_id_users",
            "users",
            ["user_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("activity_logs") as batch_op:
        batch_op.drop_constraint(
            "fk_activity_logs_user_id_users",
            type_="foreignkey",
        )
