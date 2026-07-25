"""خروجی موتور: پیش‌نمایش برنامه پیش از هر نوشتنی در دیتابیس.

سند صریح است که تقویم‌ها ابتدا «در حافظه» ساخته و به مشاور نشان داده شوند. این
ساختارها همان نتیجه‌ی درون‌حافظه‌اند: هیچ شناسه‌ی دیتابیسی، هیچ رویداد ذخیره‌شده و
هیچ اثر جانبی‌ای در آن‌ها نیست — و دقیقاً همین‌ها هستند که هنگام انتشار به رویداد
تقویم تبدیل می‌شوند.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping

from ..enums import IntensityLevel, PlanWarningCode
from ..value_objects.plan_window import PlanWindow
from ..value_objects.planned_block import PlannedBlock
from ..value_objects.subject_quota import SubjectQuota


@dataclass(frozen=True)
class PlanWarning:
    code: str
    message: str
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class StudentPlanDraft:
    """برنامه‌ی پیشنهادی یک دانش‌آموز به‌همراه تشخیص بن‌بست."""

    student_id: int
    blocks: tuple[PlannedBlock, ...]
    quotas: tuple[SubjectQuota, ...]
    allocated_by_subject: Mapping[str, int]
    capacity_minutes: int
    warnings: tuple[PlanWarning, ...] = ()

    @property
    def required_minutes(self) -> int:
        return sum(quota.minutes for quota in self.quotas)

    @property
    def allocated_minutes(self) -> int:
        return sum(self.allocated_by_subject.values())

    @property
    def shortfall_minutes(self) -> int:
        return max(self.required_minutes - self.allocated_minutes, 0)

    @property
    def has_deadlock(self) -> bool:
        """بن‌بست یعنی برنامه‌ی خواسته‌شده در ظرفیت این دانش‌آموز جا نشده است."""
        return self.shortfall_minutes > 0

    def shortfall_by_subject(self) -> dict[str, int]:
        return {
            quota.subject: quota.minutes - self.allocated_by_subject.get(quota.subject, 0)
            for quota in self.quotas
            if quota.minutes > self.allocated_by_subject.get(quota.subject, 0)
        }


@dataclass(frozen=True)
class PlanPreview:
    window: PlanWindow
    intensity: IntensityLevel
    drafts: tuple[StudentPlanDraft, ...]

    @property
    def student_ids(self) -> tuple[int, ...]:
        return tuple(draft.student_id for draft in self.drafts)

    @property
    def total_blocks(self) -> int:
        return sum(len(draft.blocks) for draft in self.drafts)

    @property
    def blocked_students(self) -> tuple[StudentPlanDraft, ...]:
        """دانش‌آموزانی که کسری زمان دارند — همان فهرستی که مشاور باید ببیند."""
        return tuple(draft for draft in self.drafts if draft.has_deadlock)

    @property
    def has_deadlock(self) -> bool:
        return bool(self.blocked_students)

    def draft_for(self, student_id: int) -> StudentPlanDraft | None:
        for draft in self.drafts:
            if draft.student_id == student_id:
                return draft
        return None


def format_minutes(minutes: int) -> str:
    """۲۱۰ → «۳ ساعت و ۳۰ دقیقه» (برای متن هشدارها)."""
    hours, mins = divmod(max(minutes, 0), 60)
    if hours and mins:
        return f'{hours} ساعت و {mins} دقیقه'
    if hours:
        return f'{hours} ساعت'
    return f'{mins} دقیقه'


__all__ = [
    'PlanPreview',
    'PlanWarning',
    'PlanWarningCode',
    'StudentPlanDraft',
    'format_minutes',
]
