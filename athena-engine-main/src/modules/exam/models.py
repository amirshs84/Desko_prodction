from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any, Self, Sequence
from uuid import UUID

import uuid6
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base
from src.core.exceptions import (
    DuplicateExamProblem,
    DuplicateSessionParticipant,
    DuplicateSnapshotOrderIndex,
    EmptyExamCannotBePublished,
    EmptySessionNotAllowed,
    ExamHasSessions,
    ExamNotEditable,
    ExamProblemNotFound,
    IncompleteReorder,
    InvalidExamTitle,
    InvalidSessionEndTime,
    InvalidSessionStartTime,
    InvalidSnapshotOrderIndex,
    InvalidScoring,
    InvalidStatusTransition,
    InvalidTimePeriod,
    NaiveDatetimeNotAllowed,
    ParticipantsNotModifiable,
    SessionAlreadyExpired,
    SessionNotStartedYet,
    SessionParticipantNotFound,
    SessionWasCancelled,
)
from src.core.type_decorator import PydanticJSONB
from src.modules.exam.database_schemas import ExamConfigSchema
from src.modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPrivatePayloadSchema,
    MCQPublicPayloadSchema,
)
from src.modules.problem.models import ProblemType

# ---------------- Exam Aggregate ---------------

class ExamStatus(StrEnum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


_EXAM_EDITABLE_STATUSES: frozenset[ExamStatus] = frozenset(
    {ExamStatus.DRAFT,}
)


_EXAM_ALLOWED_TRANSITIONS: dict[ExamStatus, frozenset[ExamStatus]] = {
    ExamStatus.DRAFT: frozenset({ExamStatus.DRAFT, ExamStatus.PUBLISHED, ExamStatus.ARCHIVED,}),
    ExamStatus.PUBLISHED: frozenset({ExamStatus.DRAFT, ExamStatus.ARCHIVED,}),
    ExamStatus.ARCHIVED: frozenset({ExamStatus.DRAFT,}),
}


@dataclass(frozen=True, slots=True)
class Scoring:
    score: Decimal
    negative_score: Decimal = Decimal("0.00")

    def __post_init__(self):
        if self.score <= 0:
            raise InvalidScoring()
        if self.negative_score < 0:
            raise InvalidScoring()
        if self.negative_score > self.score:
            raise InvalidScoring()


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    status: Mapped[ExamStatus] = mapped_column(
        SQLEnum(ExamStatus, native_enum=False, length=20),
        default=ExamStatus.DRAFT,
        server_default=text("'DRAFT'"),
        nullable=False,
    )

    config: Mapped[ExamConfigSchema] = mapped_column(
        PydanticJSONB(ExamConfigSchema),
        nullable=False,
    )

    created_by: Mapped[UUID] = mapped_column(
        nullable=False,
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

    _exam_problems: Mapped[list["ExamProblem"]] = relationship(
        back_populates="exam",
        cascade="all, delete-orphan",
        lazy="raise",
        passive_deletes=True,
        order_by="ExamProblem.order_index",
    )

    __table_args__ = (
        Index("ix_exams_status_created_at", "status", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Exam(id={self.id}, status={self.status})>"

    # ---------- factory ----------

    @classmethod
    def create_draft(
        cls,
        *,
        id: UUID | None = None,
        title: str,
        description: str | None = None,
        config: ExamConfigSchema,
        created_by: UUID,
    ) -> Self:
        exam = cls(
            id=id or uuid6.uuid7(),
            title=cls._clean_title(title),
            description=description,
            status=ExamStatus.DRAFT,
            config=config,
            created_by=created_by,
        )
        exam._exam_problems = []
        return exam

    # ------------------------------------

    def rename(self, title: str) -> None:
        self._ensure_mutable()
        self.title = self._clean_title(title)

    def update_description(self, description: str | None) -> None:
        self._ensure_mutable()
        self.description = description

    def replace_config(self, config: ExamConfigSchema) -> None:
        self._ensure_structurally_editable()
        self.config = config

    # ------------------------------------

    def add_problem(
        self,
        *,
        id: UUID | None = None,
        problem_id: UUID,
        scoring: Scoring,
        config: dict[str, Any],
    ) -> UUID:
        self._ensure_structurally_editable()

        if any(ep.problem_id == problem_id for ep in self._exam_problems):
            raise DuplicateExamProblem()

        exam_problem = ExamProblem(
            id=id or uuid6.uuid7(),
            problem_id=problem_id,
            order_index=self._next_order_index(),
            score=scoring.score,
            negative_score=scoring.negative_score,
            config=config,
        )
        self._exam_problems.append(exam_problem)
        return exam_problem.id

    def remove_problem(self, exam_problem_id: UUID) -> None:
        self._ensure_structurally_editable()
        target = self._require_problem(exam_problem_id)
        self._exam_problems.remove(target)
        self._compact_order_indexes()

    def update_problem_scoring(
        self,
        exam_problem_id: UUID,
        *,
        scoring: Scoring,
    ) -> None:
        self._ensure_structurally_editable()
        target = self._require_problem(exam_problem_id)
        target.change_scoring(scoring=scoring)

    def update_problem_config(
        self,
        exam_problem_id: UUID,
        *,
        config: dict[str, Any],
    ) -> None:
        self._ensure_structurally_editable()
        target = self._require_problem(exam_problem_id)
        target.replace_config(config=config)

    def reorder_problems(self, ordered_ids: Sequence[UUID]) -> None:
        self._ensure_structurally_editable()

        current = {ep.id for ep in self._exam_problems}
        requested = list(ordered_ids)
        if len(set(requested)) != len(requested) or set(requested) != current:
            raise IncompleteReorder()

        by_id = {ep.id: ep for ep in self._exam_problems}
        for position, exam_problem_id in enumerate(requested):
            by_id[exam_problem_id].order_index = position

    def move_problem(self, exam_problem_id: UUID, new_index: int) -> None:
        self._ensure_structurally_editable()
        target = self._require_problem(exam_problem_id)

        ordered = sorted(self._exam_problems, key=lambda ep: ep.order_index)
        if not 0 <= new_index < len(ordered):
            raise IncompleteReorder()

        ordered.remove(target)
        ordered.insert(new_index, target)
        self.reorder_problems([ep.id for ep in ordered])

    # ------------------------------------

    def publish(self) -> None:
        self._ensure_transition_allowed(ExamStatus.PUBLISHED)
        if not self._exam_problems:
            raise EmptyExamCannotBePublished()
        self.status = ExamStatus.PUBLISHED

    def to_draft(self, *, has_sessions: bool) -> None:
        self._ensure_transition_allowed(ExamStatus.DRAFT)
        if has_sessions:
            raise ExamHasSessions()
        self.status = ExamStatus.DRAFT

    def archive(self, *, has_sessions: bool) -> None:
        self._ensure_transition_allowed(ExamStatus.ARCHIVED)
        if has_sessions:
            raise ExamHasSessions()
        self.status = ExamStatus.ARCHIVED

    # ------------------------------------

    @property
    def problems(self) -> Sequence["ExamProblem"]:
        return tuple(sorted(self._exam_problems, key=lambda ep: ep.order_index))

    @property
    def problem_count(self) -> int:
        return len(self._exam_problems)

    @property
    def is_editable(self) -> bool:
        return self.status != ExamStatus.ARCHIVED

    @property
    def is_structurally_editable(self) -> bool:
        return self.status in _EXAM_EDITABLE_STATUSES

    # ------------------------------------

    def _ensure_mutable(self) -> None:
        if not self.is_editable:
            raise ExamNotEditable(self.id, self.status)

    def _ensure_structurally_editable(self) -> None:
        if not self.is_structurally_editable:
            raise ExamNotEditable(self.id, self.status)

    def _ensure_transition_allowed(self, target: ExamStatus) -> None:
        if target not in _EXAM_ALLOWED_TRANSITIONS[self.status]:
            raise InvalidStatusTransition()

    def _require_problem(self, exam_problem_id: UUID) -> ExamProblem:
        for exam_problem in self._exam_problems:
            if exam_problem.id == exam_problem_id:
                return exam_problem
        raise ExamProblemNotFound()

    def _next_order_index(self) -> int:
        if not self._exam_problems:
            return 0
        return max(ep.order_index for ep in self._exam_problems) + 1

    def _compact_order_indexes(self) -> None:
        for position, exam_problem in enumerate(
            sorted(self._exam_problems, key=lambda ep: ep.order_index)
        ):
            exam_problem.order_index = position

    @staticmethod
    def _clean_title(title: str) -> str:
        cleaned = title.strip()
        if not cleaned or len(cleaned) > 255:
            raise InvalidExamTitle()
        return cleaned


class ExamProblem(Base):
    __tablename__ = "exam_problems"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    exam_id: Mapped[UUID] = mapped_column(
        ForeignKey("exams.id", ondelete="CASCADE"),
        nullable=False,
    )

    problem_id: Mapped[UUID] = mapped_column(
        ForeignKey("problems.id", ondelete="RESTRICT"),
        nullable=False,
    )

    order_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    score: Mapped[Decimal] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=False,
        default=Decimal("1.00"),
        server_default=text("1.00"),
    )

    negative_score: Mapped[Decimal] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=False,
        default=Decimal("0.00"),
        server_default=text("0.00"),
    )

    config: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
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

    exam: Mapped["Exam"] = relationship(
        back_populates="_exam_problems",
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint("exam_id", "problem_id"),
        UniqueConstraint(
            "exam_id",
            "order_index",
            deferrable=True,
            initially="DEFERRED",
        ),
        CheckConstraint("score > 0", name="ck_exam_problem_score_positive"),
        CheckConstraint(
            "negative_score >= 0",
            name="ck_exam_problem_negative_score_non_negative",
        ),
        CheckConstraint("negative_score <= score"),
        CheckConstraint("order_index >= 0", name="ck_exam_problems_order_nonneg"),
        Index("ix_exam_problem_problem_id", "problem_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<ExamProblem(id={self.id}, exam_id={self.exam_id}, "
            f"problem_id={self.problem_id}, order_index={self.order_index})>"
        )
    
    # ------------------------------------

    @property
    def scoring(self) -> Scoring:
        return Scoring(score=self.score, negative_score=self.negative_score)

    # ------------------------------------

    def change_scoring(self, scoring: Scoring) -> None:
        self.score = scoring.score
        self.negative_score = scoring.negative_score

    def replace_config(self, config: dict[str, Any]) -> None:
        self.config = dict(config)


# ------------ ExamSession Aggregate ------------

class ExamSessionStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class SessionParticipantStatus(StrEnum):
    ASSIGNED = "ASSIGNED"
    REMOVED = "REMOVED"


class ParticipantAddOutcome(StrEnum):
    CREATED = "CREATED"
    REASSIGNED = "REASSIGNED"
    UNCHANGED = "UNCHANGED" 


_EXAM_SESSION_ALLOWED_TRANSITIONS: dict[ExamSessionStatus, frozenset[ExamSessionStatus]] = {
    ExamSessionStatus.SCHEDULED: frozenset({ExamSessionStatus.SCHEDULED, ExamSessionStatus.RUNNING, ExamSessionStatus.CANCELLED}),
    ExamSessionStatus.RUNNING: frozenset({ExamSessionStatus.RUNNING, ExamSessionStatus.COMPLETED, ExamSessionStatus.CANCELLED}),
    ExamSessionStatus.COMPLETED: frozenset({ExamSessionStatus.COMPLETED}),
    ExamSessionStatus.CANCELLED: frozenset({ExamSessionStatus.CANCELLED}),
}

_TIME_PERIOD_MUTABLE_STATUSES: frozenset[ExamSessionStatus] = frozenset(
    {ExamSessionStatus.SCHEDULED}
)

_PARTICIPANT_ADDABLE_STATUSES: frozenset[ExamSessionStatus] = frozenset(
    {ExamSessionStatus.SCHEDULED, ExamSessionStatus.RUNNING}
)

_PARTICIPANT_REMOVABLE_STATUSES: frozenset[ExamSessionStatus] = frozenset(
    {ExamSessionStatus.SCHEDULED}
)


def _ensure_aware(value: datetime) -> datetime:
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        raise NaiveDatetimeNotAllowed()
    return value


@dataclass(frozen=True, slots=True)
class TimePeriod:
    start_time: datetime
    end_time: datetime

    def __post_init__(self) -> None:
        _ensure_aware(self.start_time)
        _ensure_aware(self.end_time)
        if self.start_time >= self.end_time:
            raise InvalidTimePeriod()


@dataclass(frozen=True, slots=True)
class ExamSessionProblemSnapshot:
    type: ProblemType
    public_payload: MCQPublicPayloadSchema
    private_payload: MCQPrivatePayloadSchema
    meta_data: MCQMetaDataSchema
    config: dict[str, Any]
    scoring: Scoring
    order_index: int
    exam_problem_id: UUID | None = None

    def __post_init__(self) -> None:
        if self.order_index < 0:
            raise InvalidSnapshotOrderIndex()


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    exam_id: Mapped[UUID] = mapped_column(
        ForeignKey("exams.id", ondelete="RESTRICT"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[ExamSessionStatus] = mapped_column(
        SQLEnum(ExamSessionStatus, native_enum=False, length=20),
        default=ExamSessionStatus.SCHEDULED,
        server_default=text("'SCHEDULED'"),
        nullable=False,
    )

    exam_config_snapshot: Mapped[ExamConfigSchema] = mapped_column(
        PydanticJSONB(ExamConfigSchema),
        nullable=False,
    )

    _start_time: Mapped[datetime] = mapped_column(
        "start_time",
        DateTime(timezone=True),
        nullable=False,
    )

    _end_time: Mapped[datetime] = mapped_column(
        "end_time",
        DateTime(timezone=True),
        nullable=False,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_by: Mapped[UUID] = mapped_column(
        nullable=False,
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

    _session_participants: Mapped[list["SessionParticipant"]] = relationship(
        back_populates="exam_session",
        lazy="raise",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    _exam_session_problems: Mapped[list["ExamSessionProblem"]] = relationship(
        back_populates="exam_session",
        lazy="raise",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint(
            "end_time > start_time",
            name="ck_exam_sessions_end_time_after_start_time",
        ),
        Index("ix_exam_sessions_exam_id_status", "exam_id", "status"),
        Index("ix_exam_sessions_status_end_time", "status", "end_time"),
    )

    def __repr__(self) -> str:
        return (
            f"<ExamSession(id={self.id}, exam_id={self.exam_id}, "
            f"status={self.status}, start_time={self._start_time}, "
            f"end_time={self._end_time})>"
        )

    # ---------- factory ----------

    @classmethod
    def create(
        cls,
        *,
        id: UUID | None = None,
        exam_id: UUID,
        title: str,
        exam_config_snapshot: ExamConfigSchema,
        time_period: TimePeriod,
        created_by: UUID,
        problem_snapshots: Sequence[ExamSessionProblemSnapshot],
        now: datetime,
    ) -> Self:
        _ensure_aware(now)

        if time_period.start_time <= now:
            raise InvalidSessionStartTime()

        if not problem_snapshots:
            raise EmptySessionNotAllowed()

        indices = [s.order_index for s in problem_snapshots]
        if len(indices) != len(set(indices)):
            raise DuplicateSnapshotOrderIndex()

        session = cls(
            id=id or uuid6.uuid7(),
            exam_id=exam_id,
            title=cls._clean_title(title),
            exam_config_snapshot=exam_config_snapshot,
            _start_time=time_period.start_time,
            _end_time=time_period.end_time,
            created_by=created_by,
            status=ExamSessionStatus.SCHEDULED,
        )

        session._exam_session_problems = [
            ExamSessionProblem(
                id=uuid6.uuid7(),
                exam_session_id=session.id,
                exam_problem_id=snapshot.exam_problem_id,
                type_snapshot=snapshot.type,
                public_payload_snapshot=snapshot.public_payload,
                private_payload_snapshot=snapshot.private_payload,
                meta_data_snapshot=snapshot.meta_data,
                config_snapshot=snapshot.config,
                score_snapshot=snapshot.scoring.score,
                negative_score_snapshot=snapshot.scoring.negative_score,
                order_index_snapshot=snapshot.order_index,
            )
            for snapshot in problem_snapshots
        ]

        return session

    # -----------------------------

    def rename(self, title: str) -> None:
        self.title = self._clean_title(title)

    def change_time_period(self, time_period: TimePeriod, *, now: datetime) -> None:
        _ensure_aware(now)

        if self.status in _TIME_PERIOD_MUTABLE_STATUSES:
            if time_period.start_time <= now:
                raise InvalidSessionStartTime()

            self._start_time = time_period.start_time
            self._end_time = time_period.end_time

        elif self.status == ExamSessionStatus.RUNNING:
            if time_period.start_time != self._start_time:
                raise InvalidSessionStartTime()

            if time_period.end_time <= now:
                raise InvalidSessionEndTime()

            self._end_time = time_period.end_time

        else:
            raise InvalidStatusTransition()

    # -----------------------------

    def start(self, *, now: datetime) -> None:
        _ensure_aware(now)

        if self.status == ExamSessionStatus.RUNNING:
            return

        self._ensure_transition_allowed(ExamSessionStatus.RUNNING)

        if now < self.time_period.start_time:
            raise SessionNotStartedYet()

        if now >= self.time_period.end_time:
            raise SessionAlreadyExpired()

        self.status = ExamSessionStatus.RUNNING
        self._started_at = now

    def complete(self) -> None:
        self._ensure_transition_allowed(ExamSessionStatus.COMPLETED)

        self.status = ExamSessionStatus.COMPLETED

    def cancel(self, *, now: datetime) -> None:
        _ensure_aware(now)

        if self.status == ExamSessionStatus.CANCELLED:
            return

        self._ensure_transition_allowed(ExamSessionStatus.CANCELLED)

        self.status = ExamSessionStatus.CANCELLED
        self.cancelled_at = now

    # -----------------------------

    def add_participant(self, user_id: UUID) -> ParticipantAddOutcome:
        if self.status not in _PARTICIPANT_ADDABLE_STATUSES:
            raise ParticipantsNotModifiable()

        existing = next(
            (p for p in self._session_participants if p.user_id == user_id),
            None,
        )

        if existing:
            if existing.is_active:
                return ParticipantAddOutcome.UNCHANGED

            existing.status = SessionParticipantStatus.ASSIGNED
            return ParticipantAddOutcome.REASSIGNED

        self._session_participants.append(
            SessionParticipant(
                id=uuid6.uuid7(),
                exam_session_id=self.id,
                user_id=user_id,
                status=SessionParticipantStatus.ASSIGNED,
            )
        )
        return ParticipantAddOutcome.CREATED

    def remove_participant(self, user_id: UUID) -> None:
        if self.status not in _PARTICIPANT_REMOVABLE_STATUSES:
            raise ParticipantsNotModifiable()

        participant = next(
            (p for p in self._session_participants if p.user_id == user_id),
            None,
        )

        if not participant:
            raise SessionParticipantNotFound()

        participant.remove()

    # -----------------------------

    @property
    def participants(self) -> Sequence["SessionParticipant"]:
        return tuple(self._session_participants)

    @property
    def active_participants(self) -> Sequence["SessionParticipant"]:
        return tuple(p for p in self._session_participants if p.is_active)

    @property
    def problems(self) -> Sequence["ExamSessionProblem"]:
        return tuple(sorted(self._exam_session_problems, key=lambda esp: esp.order_index_snapshot))

    @property
    def time_period(self) -> TimePeriod:
        return TimePeriod(start_time=self._start_time, end_time=self._end_time)

    def is_active_participant(self, user_id: UUID) -> bool:
        return any(
            p.user_id == user_id and p.is_active for p in self._session_participants
        )

    # -----------------------------

    def _ensure_transition_allowed(self, target: ExamSessionStatus) -> None:
        if target not in _EXAM_SESSION_ALLOWED_TRANSITIONS[self.status]:
            raise InvalidStatusTransition()

    def _ensure_session_not_canceled(self) -> None:
        if self.status == ExamSessionStatus.CANCELLED:
            raise SessionWasCancelled()

    @staticmethod
    def _clean_title(title: str) -> str:
        cleaned = title.strip()

        if not cleaned or len(cleaned) > 255:
            raise InvalidExamTitle()

        return cleaned


class ExamSessionProblem(Base):
    __tablename__ = "exam_session_problems"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    exam_session_id: Mapped[UUID] = mapped_column(
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    exam_problem_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("exam_problems.id", ondelete="SET NULL"),
        nullable=True,
    )

    type_snapshot: Mapped[ProblemType] = mapped_column(
        SQLEnum(ProblemType, native_enum=False, length=20),
        default=ProblemType.MCQ,
        nullable=False,
    )

    public_payload_snapshot: Mapped[MCQPublicPayloadSchema] = mapped_column(
        PydanticJSONB(MCQPublicPayloadSchema),
        nullable=False,
    )

    private_payload_snapshot: Mapped[MCQPrivatePayloadSchema] = mapped_column(
        PydanticJSONB(MCQPrivatePayloadSchema),
        nullable=False,
    )

    meta_data_snapshot: Mapped[MCQMetaDataSchema] = mapped_column(
        PydanticJSONB(MCQMetaDataSchema),
        nullable=False,
    )

    config_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )

    score_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=False,
    )

    negative_score_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(precision=6, scale=2),
        nullable=False,
    )

    order_index_snapshot: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    exam_session: Mapped["ExamSession"] = relationship(
        back_populates="_exam_session_problems",
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint(
            "exam_session_id",
            "order_index_snapshot",
            deferrable=True,
            initially="DEFERRED",
        ),
        Index(
            "ix_exam_session_problems_exam_problem_id",
            "exam_problem_id",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ExamSessionProblem(id={self.id}, "
            f"exam_session_id={self.exam_session_id}, "
            f"exam_problem_id={self.exam_problem_id}, "
            f"order_index_snapshot={self.order_index_snapshot})>"
        )


class SessionParticipant(Base):
    __tablename__ = "session_participants"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    exam_session_id: Mapped[UUID] = mapped_column(
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[UUID] = mapped_column(
        nullable=False,
    )

    status: Mapped[SessionParticipantStatus] = mapped_column(
        SQLEnum(SessionParticipantStatus, native_enum=False, length=20),
        default=SessionParticipantStatus.ASSIGNED,
        server_default=text("'ASSIGNED'"),
        nullable=False,
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

    exam_session: Mapped["ExamSession"] = relationship(
        back_populates="_session_participants",
        lazy="raise",
    )

    __table_args__ = (
        UniqueConstraint(
            "exam_session_id",
            "user_id",
            name="uq_session_participants_exam_session_id_user_id",
        ),
        Index("ix_session_participants_user_id_exam_session_id", "user_id", "exam_session_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<SessionParticipant(id={self.id}, exam_session_id={self.exam_session_id}, "
            f"user_id={self.user_id}, status={self.status})>"
        )

    # -------------------------

    @property
    def is_active(self) -> bool:
        return self.status is SessionParticipantStatus.ASSIGNED

    def remove(self) -> None:
        self.status = SessionParticipantStatus.REMOVED
