"""units, retainer signature, extra charges

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-05 10:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cases', sa.Column('units', sa.Integer(), server_default='1', nullable=False))
    op.add_column('cases', sa.Column('retainer', sa.JSON(), nullable=True))
    op.create_table('charges',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('case_id', sa.Integer(), nullable=False),
    sa.Column('addon', sa.String(length=40), nullable=False),
    sa.Column('option', sa.String(length=40), nullable=False),
    sa.Column('label', sa.String(length=120), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('fee', sa.Integer(), nullable=False),
    sa.Column('vat', sa.Integer(), nullable=False),
    sa.Column('total', sa.Integer(), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_charges_case_id'), 'charges', ['case_id'], unique=False)
    op.add_column('payments', sa.Column('charge_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_payments_charge_id'), 'payments', ['charge_id'], unique=False)
    op.create_foreign_key('fk_payments_charge_id', 'payments', 'charges', ['charge_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_payments_charge_id', 'payments', type_='foreignkey')
    op.drop_index(op.f('ix_payments_charge_id'), table_name='payments')
    op.drop_column('payments', 'charge_id')
    op.drop_index(op.f('ix_charges_case_id'), table_name='charges')
    op.drop_table('charges')
    op.drop_column('cases', 'retainer')
    op.drop_column('cases', 'units')
