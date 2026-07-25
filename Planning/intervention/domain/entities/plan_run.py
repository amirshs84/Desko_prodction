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

from ....shared.domain.errors import ConflictError
from ..enums import IntensityLevel, PlanMode, ProposalStatus
from ..value_objects.plan_window import PlanWindow
from ..value_objects.planned_block import PlannedBlock


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

    @property
    def is_pending(self) -> bool:
        return self.status is ProposalStatus.PENDING

    @property
    def total_minutes(self) -> int:
        return sum(block.minutes for block in self.blocks)

    def ensure_pending(self) -> None:
        if not self.is_pending:
            raise ConflictError(
                'به این پیشنهاد قبلاً پاسخ داده شده است.',
                meta={'status': self.status.value},
            )

    def accept(self, *, applied_blocks: int) -> None:
        self.ensure_pending()
        self.status = ProposalStatus.ACCEPTED
        self.applied_blocks = applied_blocks

    def reject(self) -> None:
        self.ensure_pending()
        self.status = ProposalStatus.REJECTED


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
