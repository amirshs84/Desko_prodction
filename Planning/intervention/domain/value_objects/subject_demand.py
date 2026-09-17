"""SubjectDemand — تقاضای خام مشاور برای یک درس، پیش از تبدیل به دقیقه.

دو شکل تقاضا پذیرفته می‌شود و هر دو در همین یک شیء جا می‌شوند:

  • «۸ ساعت ریاضی»      → ``unit=MINUTES, amount=480``
  • «۱۰۰ تست ریاضی»     → ``unit=COUNT, amount=100, activity=TEST``

حالت دوم را ``WorkloadEstimator`` بر اساس نرخ واقعی همان دانش‌آموز به دقیقه تبدیل
می‌کند؛ نتیجه یک ``SubjectQuota`` است. اولویت و شناوری اینجا اختیاری‌اند: اگر
مشاور تعیین نکند، از پروفایل درس در کاتالوگ مدرسه ارث می‌رسند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject
from ..enums import ActivityKind, DemandUnit, clamp_movability, clamp_priority
from .subject_profile import MAX_SUBJECT_NAME_LENGTH, SubjectProfile

#: سقف عقلانی برای جلوگیری از ورودی اشتباه (مثلاً ۴۸۰۰۰ دقیقه به‌جای ۴۸۰).
MAX_DEMAND_MINUTES = 60 * 200
MAX_DEMAND_COUNT = 5000


@dataclass(frozen=True)
class SubjectDemand(ValueObject):
    subject: str
    amount: int
    unit: DemandUnit = DemandUnit.MINUTES
    activity: ActivityKind = ActivityKind.STUDY
    #: ``None`` یعنی «از پروفایل درس بردار».
    priority: int | None = None
    movability: int | None = None

    def __post_init__(self) -> None:
        cleaned = (self.subject or '').strip()
        if not cleaned:
            raise ValidationError('نام درس نمی‌تواند خالی باشد.')
        if len(cleaned) > MAX_SUBJECT_NAME_LENGTH:
            raise ValidationError('نام درس بیش از حد بلند است.')
        object.__setattr__(self, 'subject', cleaned)

        if self.amount <= 0:
            raise ValidationError(
                f'مقدار درخواستی برای «{cleaned}» باید بزرگ‌تر از صفر باشد.',
            )
        ceiling = MAX_DEMAND_MINUTES if self.is_time_based else MAX_DEMAND_COUNT
        if self.amount > ceiling:
            raise ValidationError(
                f'مقدار درخواستی برای «{cleaned}» غیرواقعی است.',
                meta={'amount': self.amount, 'unit': self.unit.value},
            )
        if self.unit is DemandUnit.COUNT and not self.activity.is_countable:
            raise ValidationError(
                f'برای فعالیت «{self.activity.value}» تعداد معنا ندارد؛ زمان را وارد کنید.',
                meta={'subject': cleaned, 'activity': self.activity.value},
            )

    # ---------- ویژگی‌ها ----------

    @property
    def is_time_based(self) -> bool:
        return self.unit is DemandUnit.MINUTES

    def resolved_priority(self, profile: SubjectProfile) -> int:
        if self.priority is None:
            return profile.default_priority
        return clamp_priority(self.priority)

    def resolved_movability(self, profile: SubjectProfile) -> int:
        if self.movability is None:
            return profile.default_movability
        return clamp_movability(self.movability)

    # ---------- سازنده‌های کمکی ----------

    @classmethod
    def of_minutes(cls, subject: str, minutes: int, **kwargs) -> 'SubjectDemand':
        return cls(subject=subject, amount=minutes, unit=DemandUnit.MINUTES, **kwargs)

    @classmethod
    def of_count(
        cls, subject: str, count: int, *, activity: ActivityKind = ActivityKind.TEST, **kwargs,
    ) -> 'SubjectDemand':
        return cls(
            subject=subject, amount=count, unit=DemandUnit.COUNT, activity=activity, **kwargs,
        )
