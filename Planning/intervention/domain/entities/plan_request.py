"""PlanRequest — پارامترهای برنامه‌ریزی گروهی که مشاور وارد می‌کند.

دو شکل ورودی پذیرفته می‌شود و دقیقاً یکی از آن‌ها باید بیاید:

  ۱. تقاضای صریح هر درس (``demands``):
       «۱۰ ساعت ریاضی»   → ``SubjectDemand.of_minutes('ریاضی', 600)``
       «۱۰۰ تست ریاضی»   → ``SubjectDemand.of_count('ریاضی', 100)``
     در حالت تعدادی، ``WorkloadEstimator`` بر اساس نرخ واقعی همان دانش‌آموز آن را
     به دقیقه تبدیل می‌کند؛ پس یک درخواست واحد برای دو دانش‌آموز می‌تواند دو حجم
     زمانی متفاوت بسازد — و این دقیقاً چیزی است که می‌خواهیم.

  ۲. زمان کل + وزن‌دهی (``subjects`` + ``total_minutes``) که تقسیمش را
     ``SubjectWeightCalculator`` انجام می‌دهد.

پارامتر قدیمی ``quotas`` هنوز پذیرفته می‌شود و بی‌صدا به ``demands`` زمانی ترجمه
می‌گردد، تا کدها و تست‌های موجود نشکنند.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ....shared.domain.errors import ValidationError
from ..enums import IntensityLevel
from ..value_objects.plan_window import PlanWindow
from ..value_objects.subject_demand import SubjectDemand
from ..value_objects.subject_quota import SubjectQuota

MAX_SUBJECTS = 20


@dataclass(frozen=True)
class PlanRequest:
    window: PlanWindow
    demands: tuple[SubjectDemand, ...] = ()
    #: مسیر سازگاری عقب‌رو؛ در ``__post_init__`` به ``demands`` تبدیل می‌شود.
    quotas: tuple[SubjectQuota, ...] = ()
    subjects: tuple[str, ...] = ()
    total_minutes: int = 0
    intensity: IntensityLevel = IntensityLevel.NORMAL

    def __post_init__(self) -> None:
        if self.quotas and not self.demands:
            object.__setattr__(
                self,
                'demands',
                tuple(
                    SubjectDemand.of_minutes(
                        quota.subject,
                        quota.minutes,
                        priority=quota.priority,
                        movability=quota.movability,
                        activity=quota.activity,
                    )
                    for quota in self.quotas
                ),
            )

        if self.demands and (self.subjects or self.total_minutes):
            raise ValidationError(
                'یا تقاضای هر درس را بفرستید یا زمان کل و فهرست درس‌ها، نه هر دو.'
            )
        if not self.demands:
            if not self.subjects or self.total_minutes <= 0:
                raise ValidationError('فهرست درس‌ها و زمان کل برنامه لازم است.')
        if len(self.subject_names) > MAX_SUBJECTS:
            raise ValidationError(f'حداکثر {MAX_SUBJECTS} درس در یک برنامه مجاز است.')
        if len(set(self.subject_names)) != len(self.subject_names):
            raise ValidationError('نام درس‌ها تکراری است.')

    # ---------- ویژگی‌ها ----------

    @property
    def subject_names(self) -> tuple[str, ...]:
        if self.demands:
            return tuple(demand.subject for demand in self.demands)
        return self.subjects

    @property
    def is_weight_based(self) -> bool:
        return not self.demands

    @property
    def has_unit_demand(self) -> bool:
        """آیا لازم است تخمین‌گر حجم کار صدا زده شود؟"""
        return any(not demand.is_time_based for demand in self.demands)

    @property
    def requested_minutes(self) -> int:
        """جمع تقاضا بر حسب دقیقه؛ تقاضای تعدادی هنوز حل نشده و صفر حساب می‌شود."""
        if self.demands:
            return sum(demand.amount for demand in self.demands if demand.is_time_based)
        return self.total_minutes
