"""staff 2FA by email code (alternative to an authenticator app)

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-10 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mfa_email_enabled_at', sa.DateTime(timezone=True), nullable=True))
    op.create_table('mfa_email_codes',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('code_hash', sa.String(length=64), nullable=False),
    sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_mfa_email_codes_user_id', 'mfa_email_codes', ['user_id'])
    op.create_index('ix_mfa_email_codes_created_at', 'mfa_email_codes', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_mfa_email_codes_created_at', table_name='mfa_email_codes')
    op.drop_index('ix_mfa_email_codes_user_id', table_name='mfa_email_codes')
    op.drop_table('mfa_email_codes')
    op.drop_column('users', 'mfa_email_enabled_at')
