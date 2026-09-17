"""PlanRun و PlanProposal — رد ماندگارِ یک انتشار برنامه.

``PlanRun`` یک بار انتشار است (چه پیشنهادی چه قطعی) و ``PlanProposal`` سهم هر
دانش‌آموز از آن. در حالت قطعی هم پیشنهادها ثبت می‌شوند اما بلافاصله ``ACCEPTED``
هستند؛ نتیجه این می‌شود که «چه چیزی برای چه کسی فرستاده شد» یک تاریخچه‌ی واحد دارد
و گزارش‌گیری لازم نیست دو مسیر متفاوت را بشناسد.

``group_tag`` روی همه‌ی رویدادهای ساخته‌شده از یک اجرا می‌نشیند (همان ``group_id``
تقویم)، پس حذف دسته‌ای یک برنامه با یک کوئری ممکن است.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime

from ....shared.domain.errors import ConflictError, ValidationError
from ..enums import IntensityLevel, PlanMode, ProposalStatus
from ..value_objects.plan_window import PlanWindow
from ..value_objects.planned_block import PlannedBlock

BLOCK_PENDING = 'pending'
BLOCK_ACCEPTED = 'accepted'
BLOCK_REJECTED = 'rejected'


@dataclass
class PlanProposal:
    student_id: int
    blocks: tuple[PlannedBlock, ...]
    status: ProposalStatus = ProposalStatus.PENDING
    id: int | None = None
    plan_run_id: int | None = None
    #: برچسب رویدادهای همان اجرا؛ روی پیشنهاد هم نگه داشته می‌شود تا مسیر «پذیرش
    #: توسط دانش‌آموز» برای ساخت رویداد نیازی به خواندن اجرای برنامه نداشته باشد.
    group_tag: str = ''
    shortfall_minutes: int = 0
    applied_blocks: int = 0
    responded_at: datetime | None = None
    created_at: datetime | None = None
    #: وضعیت هر بلوک: pending / accepted / rejected — هم‌طول با ``blocks``.
    block_decisions: tuple[str, ...] = ()
    notice_seen_at: datetime | None = None
    #: از اجرای والد خوانده می‌شود؛ برای چت رد بلوک و پاپ‌آپ هدف هفته.
    consultant_id: int = 0
    goal_message: str = ''
    mode: PlanMode = PlanMode.SUGGESTED

    @property
    def is_pending(self) -> bool:
        return self.status is ProposalStatus.PENDING

    @property
    def total_minutes(self) -> int:
        return sum(block.minutes for block in self.blocks)

    def normalized_decisions(self) -> tuple[str, ...]:
        decisions = list(self.block_decisions)
        while len(decisions) < len(self.blocks):
            decisions.append(BLOCK_PENDING)
        return tuple(decisions[: len(self.blocks)])

    def pending_indices(self) -> tuple[int, ...]:
        return tuple(
            index
            for index, decision in enumerate(self.normalized_decisions())
            if decision == BLOCK_PENDING
        )

    def pending_blocks(self) -> tuple[PlannedBlock, ...]:
        return tuple(self.blocks[index] for index in self.pending_indices())

    def ensure_pending(self) -> None:
        if not self.is_pending:
            raise ConflictError(
                'به این پیشنهاد قبلاً پاسخ داده شده است.',
                meta={'status': self.status.value},
            )

    def accept(self, *, applied_blocks: int) -> None:
        """پذیرش یکجای باقی‌مانده‌ی بلوک‌ها (قرارداد قدیمی اینباکس)."""
        self.accept_remaining(applied_count=applied_blocks)

    def accept_remaining(self, *, applied_count: int) -> None:
        self.ensure_pending()
        decisions = list(self.normalized_decisions())
        for index, decision in enumerate(decisions):
            if decision == BLOCK_PENDING:
                decisions[index] = BLOCK_ACCEPTED
        self.block_decisions = tuple(decisions)
        self.applied_blocks += applied_count
        self.status = ProposalStatus.ACCEPTED

    def reject(self) -> None:
        self.reject_remaining()

    def reject_remaining(self) -> None:
        self.ensure_pending()
        decisions = list(self.normalized_decisions())
        for index, decision in enumerate(decisions):
            if decision == BLOCK_PENDING:
                decisions[index] = BLOCK_REJECTED
        self.block_decisions = tuple(decisions)
        self._refresh_status()

    def decide_block(self, index: int, *, accepted: bool, placed: bool = False) -> None:
        self.ensure_pending()
        if index < 0 or index >= len(self.blocks):
            raise ValidationError(
                'شماره بلوک نامعتبر است.',
                meta={'block_index': index, 'block_count': len(self.blocks)},
            )
        decisions = list(self.normalized_decisions())
        if decisions[index] != BLOCK_PENDING:
            raise ConflictError(
                'به این بلوک قبلاً پاسخ داده شده است.',
                meta={'block_index': index, 'status': decisions[index]},
            )
        decisions[index] = BLOCK_ACCEPTED if accepted else BLOCK_REJECTED
        if placed:
            self.applied_blocks += 1
        self.block_decisions = tuple(decisions)
        self._refresh_status()

    def _refresh_status(self) -> None:
        decisions = self.normalized_decisions()
        if any(decision == BLOCK_PENDING for decision in decisions):
            return
        if decisions and all(decision == BLOCK_REJECTED for decision in decisions):
            self.status = ProposalStatus.REJECTED
        else:
            self.status = ProposalStatus.ACCEPTED


@dataclass
class PlanRun:
    consultant_id: int
    school_id: int
    window: PlanWindow
    mode: PlanMode
    intensity: IntensityLevel
    group_tag: str
    id: int | None = None
    group_id: int | None = None
    summary: dict = field(default_factory=dict)
    proposals: tuple[PlanProposal, ...] = ()
    created_at: datetime | None = None

    @property
    def student_count(self) -> int:
        return len(self.proposals)

    @property
    def is_forced(self) -> bool:
        return self.mode is PlanMode.FORCED

    def proposal_for(self, student_id: int) -> PlanProposal | None:
        for proposal in self.proposals:
            if proposal.student_id == student_id:
                return proposal
        return None
