"""Initial Athena schema.

Revision ID: 001_initial
Revises:
Create Date: 2026-08-23
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "problems",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
        sa.Column("type", sa.String(length=20), nullable=False, server_default="MCQ"),
        sa.Column("public_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("private_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("meta_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_problems_status_created_at", "problems", ["status", "created_at"])

    op.create_table(
        "exams",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="DRAFT"),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_exams_status_created_at", "exams", ["status", "created_at"])

    op.create_table(
        "exam_problems",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("exam_id", sa.Uuid(), sa.ForeignKey("exams.id", ondelete="CASCADE"), nullable=False),
        sa.Column("problem_id", sa.Uuid(), sa.ForeignKey("problems.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("score", sa.Numeric(precision=6, scale=2), nullable=False, server_default="1.00"),
        sa.Column("negative_score", sa.Numeric(precision=6, scale=2), nullable=False, server_default="0.00"),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("exam_id", "problem_id"),
        sa.CheckConstraint("score > 0", name="ck_exam_problem_score_positive"),
        sa.CheckConstraint("negative_score >= 0", name="ck_exam_problem_negative_score_non_negative"),
        sa.CheckConstraint("negative_score <= score"),
        sa.CheckConstraint("order_index >= 0", name="ck_exam_problems_order_nonneg"),
    )
    op.create_index("ix_exam_problem_problem_id", "exam_problems", ["problem_id"])
    op.create_unique_constraint(
        "exam_problems_exam_id_order_index_key",
        "exam_problems",
        ["exam_id", "order_index"],
        deferrable=True,
        initially="DEFERRED",
    )

    op.create_table(
        "exam_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("exam_id", sa.Uuid(), sa.ForeignKey("exams.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="SCHEDULED"),
        sa.Column("exam_config_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("end_time > start_time", name="ck_exam_sessions_end_time_after_start_time"),
    )
    op.create_index("ix_exam_sessions_exam_id_status", "exam_sessions", ["exam_id", "status"])
    op.create_index("ix_exam_sessions_status_end_time", "exam_sessions", ["status", "end_time"])

    op.create_table(
        "exam_session_problems",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "exam_session_id",
            sa.Uuid(),
            sa.ForeignKey("exam_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "exam_problem_id",
            sa.Uuid(),
            sa.ForeignKey("exam_problems.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("type_snapshot", sa.String(length=20), nullable=False, server_default="MCQ"),
        sa.Column("public_payload_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("private_payload_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("meta_data_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("config_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("score_snapshot", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("negative_score_snapshot", sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column("order_index_snapshot", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_exam_session_problems_exam_problem_id",
        "exam_session_problems",
        ["exam_problem_id"],
    )
    op.create_unique_constraint(
        "exam_session_problems_exam_session_id_order_index_snapshot_key",
        "exam_session_problems",
        ["exam_session_id", "order_index_snapshot"],
        deferrable=True,
        initially="DEFERRED",
    )

    op.create_table(
        "session_participants",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "exam_session_id",
            sa.Uuid(),
            sa.ForeignKey("exam_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="ASSIGNED"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            "exam_session_id",
            "user_id",
            name="uq_session_participants_exam_session_id_user_id",
        ),
    )
    op.create_index(
        "ix_session_participants_user_id_exam_session_id",
        "session_participants",
        ["user_id", "exam_session_id"],
    )

    op.create_table(
        "session_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "session_id",
            sa.Uuid(),
            sa.ForeignKey("exam_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "participant_id",
            sa.Uuid(),
            sa.ForeignKey("session_participants.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="IN_PROGRESS"),
        sa.Column("score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("max_score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("min_score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expire_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "submitted_at IS NULL OR submitted_at >= started_at",
            name="ck_session_attempts_submitted_after_started",
        ),
        sa.CheckConstraint(
            "status = 'IN_PROGRESS' OR submitted_at IS NOT NULL",
            name="ck_session_attempts_submitted_at_required",
        ),
        sa.CheckConstraint(
            "status <> 'FINISHED' OR (score IS NOT NULL AND max_score IS NOT NULL AND min_score IS NOT NULL)",
            name="ck_session_attempts_finished_requires_score",
        ),
        sa.CheckConstraint(
            "expire_at > started_at",
            name="ck_session_attempts_expire_after_started",
        ),
        sa.CheckConstraint(
            "(score IS NULL) = (max_score IS NULL) AND (score IS NULL) = (min_score IS NULL)",
            name="ck_session_attempts_score_triplet_consistent",
        ),
        sa.CheckConstraint(
            "max_score IS NULL OR max_score > 0",
            name="ck_session_attempts_max_score_positive",
        ),
        sa.CheckConstraint(
            "min_score IS NULL OR min_score <= 0",
            name="ck_session_attempts_min_score_non_positive",
        ),
        sa.CheckConstraint(
            "score IS NULL OR score BETWEEN min_score AND max_score",
            name="ck_session_attempts_score_within_bounds",
        ),
        sa.UniqueConstraint("participant_id", name="uq_session_attempts_one_per_participant"),
        sa.UniqueConstraint(
            "user_id",
            "session_id",
            name="uq_session_attempts_one_per_user_and_session",
        ),
    )
    op.create_index("ix_session_attempts_user_id", "session_attempts", ["user_id"])
    op.create_index("ix_session_attempts_session_id", "session_attempts", ["session_id"])
    op.create_index(
        "ix_session_attempts_status_expire_at",
        "session_attempts",
        ["status", "expire_at"],
    )

    op.create_table(
        "answers",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column(
            "session_attempt_id",
            sa.Uuid(),
            sa.ForeignKey("session_attempts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "exam_session_problem_id",
            sa.Uuid(),
            sa.ForeignKey("exam_session_problems.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("response_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("score", sa.Numeric(precision=6, scale=2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint(
            "session_attempt_id",
            "exam_session_problem_id",
            name="uq_answers_attempt_problem",
        ),
    )
    op.create_index("ix_answers_exam_session_problem_id", "answers", ["exam_session_problem_id"])


def downgrade() -> None:
    op.drop_table("answers")
    op.drop_table("session_attempts")
    op.drop_table("session_participants")
    op.drop_table("exam_session_problems")
    op.drop_table("exam_sessions")
    op.drop_table("exam_problems")
    op.drop_table("exams")
    op.drop_table("problems")
