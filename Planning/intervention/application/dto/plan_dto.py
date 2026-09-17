"""DTO های پیش‌نمایش و انتشار برنامه."""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.application.ports.school_directory import StudentInfo
from ...domain.entities.plan_draft import PlanPreview, StudentPlanDraft
from ...domain.entities.plan_run import PlanRun


@dataclass(frozen=True)
class PlanPreviewDTO:
    """پیش‌نمایش + نام دانش‌آموزان.

    نام از دامنه نمی‌آید (موتور فقط شناسه می‌شناسد) و اینجا به نتیجه چسبانده می‌شود
    تا هشدار «فلانی ۳ ساعت کسری دارد» در UI معنا داشته باشد.
    """

    preview: PlanPreview
    students: dict[int, StudentInfo]

    def student_name(self, student_id: int) -> str:
        info = self.students.get(student_id)
        return info.full_name if info else ''

    @property
    def drafts(self) -> tuple[StudentPlanDraft, ...]:
        return self.preview.drafts


@dataclass(frozen=True)
class PlanRunDTO:
    run: PlanRun
    students: dict[int, StudentInfo]
    created_events: int = 0
    snapshots_taken: int = 0
    #: بلوک‌های الگوریتمیِ قبلی که برای باز کردن جا جابه‌جا شدند.
    moved_events: int = 0

    def student_name(self, student_id: int) -> str:
        info = self.students.get(student_id)
        return info.full_name if info else ''


@dataclass(frozen=True)
class ProposalResponseDTO:
    proposal_id: int
    accepted: bool
    applied_blocks: int
    skipped_blocks: int
    status: str = ''
    reason_sent: bool = False


@dataclass(frozen=True)
class ProposalBlockResponseDTO:
    proposal_id: int
    block_index: int
    accepted: bool
    applied: bool
    skipped: bool
    status: str
    event: object | None = None
    reason_sent: bool = False
