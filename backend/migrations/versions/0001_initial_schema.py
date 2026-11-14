"""initial_astromission_22_table_schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-11-14 20:25:00.000000
"""
from alembic import op
from app.core.database import Base
import app.models.entities  # noqa: F401

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)

