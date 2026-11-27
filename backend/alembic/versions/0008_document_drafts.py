"""document drafts (AI generated / human edited versions) and draft exemplars

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-27 12:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0008'
down_revision: Union[str, None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('document_drafts',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('case_id', sa.Integer(), nullable=False),
    sa.Column('version', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('source', sa.String(length=10), nullable=False),
    sa.Column('status', sa.String(length=12), nullable=False),
    sa.Column('error', sa.Text(), nullable=True),
    sa.Column('model', sa.String(length=120), nullable=True),
    sa.Column('extra_prompt', sa.Text(), nullable=True),
    sa.Column('base_version', sa.Integer(), nullable=True),
    sa.Column('exemplar_ids', sa.JSON(), nullable=False),
    sa.Column('flagged_citations', sa.JSON(), nullable=False),
    sa.Column('input_tokens', sa.Integer(), nullable=True),
    sa.Column('output_tokens', sa.Integer(), nullable=True),
    sa.Column('latency_ms', sa.Integer(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('case_id', 'version', name='uq_document_drafts_case_version'),
    )
    op.create_index('ix_document_drafts_case_id', 'document_drafts', ['case_id'])
    op.create_table('draft_exemplars',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('service_slug', sa.String(length=40), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('deidentified_checked_by', sa.Integer(), nullable=True),
    sa.Column('active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['deidentified_checked_by'], ['users.id']),
    sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_draft_exemplars_service_slug', 'draft_exemplars', ['service_slug'])


def downgrade() -> None:
    op.drop_index('ix_draft_exemplars_service_slug', table_name='draft_exemplars')
    op.drop_table('draft_exemplars')
    op.drop_index('ix_document_drafts_case_id', table_name='document_drafts')
    op.drop_table('document_drafts')
