from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Self
from uuid import UUID

import uuid6
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Numeric,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from core.type_decorator import PydanticJSONB
from core.exceptions import (
    AnswerNotFound,
    AttemptNotGraded,
    AttemptNotInProgress,
    AttemptNotSubmitted,
    InvalidAttemptScore,
    InvalidStatusTransition,
    SessionAlreadyExpired,
    SessionNotStartedYet,
    IncompleteGrading,
    InvalidAttemptDeadline,
    AttemptExpired,
    MissingProblemGradingDataError,
)

from modules.exam.models import TimePeriod, _ensure_aware

from modules.session.database_schemas import MCQResponseDataSchema
from modules.exam.schemas import ExamSessionProblemGradingData


# ------------ SessionAttempt Aggregate ------------

class SessionAttemptStatus(StrEnum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    FINISHED = "FINISHED"  # Graded


_SESSION_ATTEMPT_ALLOWED_TRANSITIONS: dict[
    SessionAttemptStatus, frozenset[SessionAttemptStatus]
] = {
    SessionAttemptStatus.IN_PROGRESS: frozenset(
        {SessionAttemptStatus.IN_PROGRESS, SessionAttemptStatus.SUBMITTED}
    ),
    SessionAttemptStatus.SUBMITTED: frozenset(
        {SessionAttemptStatus.SUBMITTED, SessionAttemptStatus.FINISHED}
    ),
    SessionAttemptStatus.FINISHED: frozenset({SessionAttemptStatus.FINISHED}),
}


class SessionAttempt(Base):
    __tablename__ = "session_attempts"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    user_id: Mapped[UUID] = mapped_column(
        nullable=False,
    )

    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    participant_id: Mapped[UUID] = mapped_column(
        ForeignKey("session_participants.id", ondelete="CASCADE"),
        nullable=False,
    )

    status: Mapped[SessionAttemptStatus] = mapped_column(
        SQLEnum(SessionAttemptStatus, native_enum=False, length=20),
        default=SessionAttemptStatus.IN_PROGRESS,
        server_default=text("'IN_PROGRESS'"),
        nullable=False,
    )

    score: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=True,
    )

    max_score: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=True,
    )

    min_score: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=5, scale=2),
        nullable=True,
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    expire_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    _answers: Mapped[list["Answer"]] = relationship(
        back_populates="session_attempt",
        cascade="all, delete-orphan",
        lazy="raise",
        passive_deletes=True,
        order_by="Answer.created_at",
    )

    __table_args__ = (
        CheckConstraint(
            "submitted_at IS NULL OR submitted_at >= started_at",
            name="ck_session_attempts_submitted_after_started",
        ),
        CheckConstraint(
            "status = 'IN_PROGRESS' OR submitted_at IS NOT NULL",
            name="ck_session_attempts_submitted_at_required",
        ),
        CheckConstraint(
            "status <> 'FINISHED' OR (score IS NOT NULL AND max_score IS NOT NULL "
            "AND min_score IS NOT NULL)",
            name="ck_session_attempts_finished_requires_score",
        ),
        CheckConstraint(
            "expire_at > started_at",
            name="ck_session_attempts_expire_after_started",
        ),
        CheckConstraint(
            "(score IS NULL) = (max_score IS NULL) "
            "AND (score IS NULL) = (min_score IS NULL)",
            name="ck_session_attempts_score_triplet_consistent",
        ),
        CheckConstraint(
            "max_score IS NULL OR max_score > 0",
            name="ck_session_attempts_max_score_positive",
        ),
        CheckConstraint(
            "min_score IS NULL OR min_score <= 0",
            name="ck_session_attempts_min_score_non_positive",
        ),
        CheckConstraint(
            "score IS NULL OR score BETWEEN min_score AND max_score",
            name="ck_session_attempts_score_within_bounds",
        ),
        UniqueConstraint(
            "participant_id",
            name="uq_session_attempts_one_per_participant",
        ),
        UniqueConstraint(
            "user_id",
            "session_id",
            name="uq_session_attempts_one_per_user_and_session",
        ),
        Index("ix_session_attempts_user_id", "user_id"),
        Index("ix_session_attempts_session_id", "session_id"),
        Index("ix_session_attempts_status_expire_at", "status", "expire_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<SessionAttempt(id={self.id}, participant_id={self.participant_id}, "
            f"status={self.status})>"
        )

    # ---------- factory ----------

    @classmethod
    def create(
        cls,
        *,
        id: UUID | None = None,
        user_id: UUID,
        session_id: UUID,
        participant_id: UUID,
        time_period: TimePeriod,
        expire_at: datetime,
        now: datetime,
    ) -> Self:
        _ensure_aware(now)
        _ensure_aware(expire_at)

        if now < time_period.start_time:
            raise SessionNotStartedYet()

        if now >= time_period.end_time:
            raise SessionAlreadyExpired()

        attempt_expire_at = min(expire_at, time_period.end_time)
        if attempt_expire_at <= now:
            raise InvalidAttemptDeadline()

        attempt = cls(
            id=id or uuid6.uuid7(),
            user_id=user_id,
            session_id=session_id,
            participant_id=participant_id,
            status=SessionAttemptStatus.IN_PROGRESS,
            score=None,
            started_at=now,
            expire_at=attempt_expire_at,
            submitted_at=None,
        )
        attempt._answers = []
        return attempt

    # ---------- lifecycle ----------

    def submit(self, *, now: datetime) -> None:
        _ensure_aware(now)

        if self.status is SessionAttemptStatus.SUBMITTED:
            return

        self._ensure_transition_allowed(SessionAttemptStatus.SUBMITTED)

        self.status = SessionAttemptStatus.SUBMITTED
        self.submitted_at = max(min(now, self.expire_at), self.started_at)

    def apply_grading(
        self,
        *,
        total_score: Decimal,
        max_score: Decimal,
        min_score: Decimal,
        scores_by_problem_id: Mapping[UUID, Decimal],
    ) -> None:
        if self.status is not SessionAttemptStatus.SUBMITTED:
            raise AttemptNotSubmitted()
        
        self._validate_total_score(
            total_score=total_score,
            max_score=max_score,
            min_score=min_score,
        )

        requested = dict(scores_by_problem_id or {})
        answers_by_problem = {
            answer.exam_session_problem_id: answer for answer in self._answers
        }

        unknown = requested.keys() - answers_by_problem.keys()
        if unknown:
            raise AnswerNotFound()

        ungraded = answers_by_problem.keys() - requested.keys()
        if ungraded:
            raise IncompleteGrading()

        for problem_id, score in requested.items():
            answers_by_problem[problem_id].assign_score(score)

        self.score = total_score
        self.max_score = max_score
        self.min_score = min_score

    def finish(self) -> None:
        if self.status is SessionAttemptStatus.FINISHED:
            return

        self._ensure_transition_allowed(SessionAttemptStatus.FINISHED)

        if self.score is None:
            raise AttemptNotGraded()

        self.status = SessionAttemptStatus.FINISHED

    # ---------- answers ----------

    def upsert_answer(
        self,
        *,
        id: UUID | None = None,
        exam_session_problem_id: UUID,
        response_data: MCQResponseDataSchema,
        now: datetime,
    ) -> UUID:
        _ensure_aware(now)

        self._ensure_accepting_answers(now=now)

        existing = self.answer_for(exam_session_problem_id)
        if existing is not None:
            existing.replace_response(response_data)
            return existing.id

        answer = Answer(
            id=id or uuid6.uuid7(),
            session_attempt_id=self.id,
            exam_session_problem_id=exam_session_problem_id,
            response_data=response_data,
        )
        self._answers.append(answer)
        return answer.id

    # ---------- read model ----------

    @property
    def answers(self) -> Sequence["Answer"]:
        return tuple(self._answers)

    @property
    def is_in_progress(self) -> bool:
        return self.status is SessionAttemptStatus.IN_PROGRESS

    @property
    def is_submitted(self) -> bool:
        return self.status is SessionAttemptStatus.SUBMITTED

    @property
    def is_graded(self) -> bool:
        return (self.score is not None) and (self.max_score is not None)

    def answer_for(self, exam_session_problem_id: UUID) -> "Answer | None":
        return next(
            (
                a
                for a in self._answers
                if a.exam_session_problem_id == exam_session_problem_id
            ),
            None,
        )

    def is_open_and_expired(self, *, now: datetime) -> bool:
        _ensure_aware(now)
        return self.is_in_progress and now >= self.expire_at

    # ---------- guards ----------

    def _ensure_accepting_answers(self, *, now: datetime) -> None:
        if self.is_open_and_expired(now=now):
            # Service should catch the raise then submit and commit
            raise AttemptExpired()

        if not self.is_in_progress:
            raise AttemptNotInProgress()

    def _ensure_transition_allowed(self, target: SessionAttemptStatus) -> None:
        if target not in _SESSION_ATTEMPT_ALLOWED_TRANSITIONS[self.status]:
            raise InvalidStatusTransition()

    @staticmethod
    def _validate_total_score(
        total_score: Decimal,
        max_score: Decimal,
        min_score: Decimal,
    ) -> None:
        if not(min_score <= total_score <= max_score):
            raise InvalidAttemptScore()


class Answer(Base):
    __tablename__ = "answers"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    session_attempt_id: Mapped[UUID] = mapped_column(
        ForeignKey("session_attempts.id", ondelete="CASCADE"),
        nullable=False,
    )

    exam_session_problem_id: Mapped[UUID] = mapped_column(
        ForeignKey("exam_session_problems.id", ondelete="RESTRICT"),
        nullable=False,
    )

    response_data: Mapped[MCQResponseDataSchema] = mapped_column(
        PydanticJSONB(MCQResponseDataSchema),
        nullable=False,
    )

    score: Mapped[Decimal | None] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    session_attempt: Mapped["SessionAttempt"] = relationship(
        back_populates="_answers",
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint(
            "session_attempt_id",
            "exam_session_problem_id",
            name="uq_answers_attempt_problem",
        ),
        Index("ix_answers_exam_session_problem_id", "exam_session_problem_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<Answer(id={self.id}, session_attempt_id={self.session_attempt_id}, "
            f"exam_session_problem_id={self.exam_session_problem_id}, "
            f"score={self.score})>"
        )

    # ---------- read model ----------

    @property
    def is_graded(self) -> bool:
        return self.score is not None

    # ---------- behaviour (internal to the aggregate) ----------

    def replace_response(self, response_data: MCQResponseDataSchema) -> None:
        self.response_data = response_data

    def assign_score(self, score: Decimal) -> None:
        self.score = score


class GradingDomainService:
    def grade_attempt(
        self,
        attempt: SessionAttempt,
        problems_grading_data: Mapping[UUID, ExamSessionProblemGradingData],
    ) -> None:
        total_score = Decimal("0.00")
        scores_by_problem_id: dict[UUID, Decimal] = {}

        for answer in attempt.answers:
            problem_id = answer.exam_session_problem_id
            
            grading_data = problems_grading_data.get(problem_id)
            if not grading_data:
                raise MissingProblemGradingDataError()
            
            score = self._calculate_mcq_score(answer.response_data, grading_data)
            scores_by_problem_id[problem_id] = score
            total_score += score

        max_score = sum(
            (d.score for d in problems_grading_data.values()), Decimal("0.00")
        )
        min_score = -sum(
            (d.negative_score for d in problems_grading_data.values()), Decimal("0.00")
        )

        attempt.apply_grading(
            total_score=total_score,
            max_score=max_score,
            min_score=min_score,
            scores_by_problem_id=scores_by_problem_id,
        )

    def _calculate_mcq_score(
        self, 
        response: MCQResponseDataSchema, 
        data: ExamSessionProblemGradingData
    ) -> Decimal:
        correct_option = data.private_payload.correct_option_id
        user_option = response.selected_option_id

        if user_option is None:
            return Decimal("0.00")

        if user_option == correct_option:
            return data.score
        
        if data.negative_score > 0:
            return -data.negative_score
            
        return Decimal("0.00")
