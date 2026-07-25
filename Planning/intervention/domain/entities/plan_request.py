"""PlanRequest — پارامترهای برنامه‌ریزی گروهی که مشاور وارد می‌کند.

دو شکل ورودی پذیرفته می‌شود و دقیقاً یکی از آن‌ها باید بیاید:

  ۱. سهمیه‌ی صریح: «۱۰ ساعت ریاضی، ۶ ساعت فیزیک» → ``quotas``
  ۲. زمان کل + وزن‌دهی: «۲۰ ساعت مطالعه روی این درس‌ها» → ``subjects`` + ``total_minutes``
     که تقسیمش را ``SubjectWeightCalculator`` انجام می‌دهد (یکنواخت یا نسبت دستی).

حالت دوم همان جایی است که در آینده ماژول AI وزن نقاط ضعف را تزریق می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ..enums import IntensityLevel
from ..value_objects.plan_window import PlanWindow
from ..value_objects.subject_quota import SubjectQuota

MAX_SUBJECTS = 20


@dataclass(frozen=True)
class PlanRequest:
    window: PlanWindow
    quotas: tuple[SubjectQuota, ...] = ()
    subjects: tuple[str, ...] = ()
    total_minutes: int = 0
    intensity: IntensityLevel = IntensityLevel.NORMAL

    def __post_init__(self) -> None:
        if self.quotas and (self.subjects or self.total_minutes):
            raise ValidationError(
                'یا سهمیه‌ی هر درس را بفرستید یا زمان کل و فهرست درس‌ها، نه هر دو.'
            )
        if not self.quotas:
            if not self.subjects or self.total_minutes <= 0:
                raise ValidationError('فهرست درس‌ها و زمان کل برنامه لازم است.')
        if len(self.subject_names) > MAX_SUBJECTS:
            raise ValidationError(f'حداکثر {MAX_SUBJECTS} درس در یک برنامه مجاز است.')
        if len(set(self.subject_names)) != len(self.subject_names):
            raise ValidationError('نام درس‌ها تکراری است.')

    @property
    def subject_names(self) -> tuple[str, ...]:
        if self.quotas:
            return tuple(quota.subject for quota in self.quotas)
        return self.subjects

    @property
    def is_weight_based(self) -> bool:
        return not self.quotas

    @property
    def requested_minutes(self) -> int:
        if self.quotas:
            return sum(quota.minutes for quota in self.quotas)
        return self.total_minutes
