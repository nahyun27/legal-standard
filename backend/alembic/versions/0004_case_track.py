"""case track (self / atty)

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-04 23:30:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0004'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cases', sa.Column('track', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('cases', 'track')
