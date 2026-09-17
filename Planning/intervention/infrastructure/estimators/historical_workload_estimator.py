"""تبدیل «تعداد» به «دقیقه» با انقباض بیزی روی سابقه‌ی واقعی دانش‌آموز.

مسئله‌ی شروع سرد: دانش‌آموزی که تازه آمده هیچ سابقه‌ای ندارد و میانگین گرفتن از صفر
نمونه بی‌معناست؛ از آن بدتر، دانش‌آموزی که فقط ۳ تست زده و اتفاقاً کند بوده، با
میانگین ساده برچسب «هر تست ۵ دقیقه» می‌گیرد و برنامه‌اش فاجعه می‌شود.

راه‌حل، انقباض به سمت prior است:

    minutes_per_unit = (دقیقه‌ی مشاهده‌شده + k × prior) / (تعداد مشاهده‌شده + k)

``k`` را می‌توان «تعداد مشاهده‌ی فرضی» خواند: تا وقتی دانش‌آموز کمتر از ``k`` واحد
سابقه دارد، تخمین بیشتر به prior تکیه می‌کند و هرچه سابقه بیشتر شود، وزن تجربه‌ی
خودش می‌چربد. همین نسبت، عدد «اطمینان» را هم می‌دهد که به مشاور نشان داده می‌شود.

در پایان، ضریب بازدهیِ برآمده از بازخورد گیمیفای‌شده اعمال می‌شود: دانش‌آموزی که
مدام بازدهی پایین ثبت می‌کند، برای همان حجم کار وقت بیشتری می‌گیرد.
"""
from __future__ import annotations

from django.db.models import Sum

from api.models import StudySession

from ...domain.enums import ActivityKind
from ...domain.ports.efficiency_profile import EfficiencyProfileReader
from ...domain.ports.workload_estimator import WorkloadEstimate, WorkloadEstimator
from ...domain.value_objects.subject_tag import SubjectTag
from ..persistence import models as m

#: «تعداد مشاهده‌ی فرضی» — قدرت prior بر حسب واحد.
PRIOR_STRENGTH_UNITS = 40
#: کف و سقف عقلانی دقیقه بر واحد، برای مهار داده‌ی خراب (تایمر فراموش‌شده و مشابه).
MIN_MINUTES_PER_UNIT = 0.3
MAX_MINUTES_PER_UNIT = 20.0

#: prior سراسری بر حسب دقیقه به‌ازای هر واحد.
_PRIOR_BY_ACTIVITY = {
    ActivityKind.TEST: 1.5,
    ActivityKind.SOLVE: 6.0,
}
#: ضریب تعدیل prior بر اساس جنس درس.
_TAG_MULTIPLIER = {
    SubjectTag.ANALYTICAL: 1.4,
    SubjectTag.MEMORIZATION: 0.7,
}
DEFAULT_PRIOR_MINUTES_PER_UNIT = 2.0


class HistoricalWorkloadEstimator(WorkloadEstimator):
    def __init__(self, *, efficiency: EfficiencyProfileReader | None = None) -> None:
        self._efficiency = efficiency

    def estimate(
        self,
        *,
        student_id: int,
        subject: str,
        activity: ActivityKind,
        units: int,
        school_id: int | None = None,
    ) -> WorkloadEstimate:
        if units <= 0:
            return WorkloadEstimate(minutes=0, confidence=1.0, minutes_per_unit=0.0)

        prior = self._prior_minutes_per_unit(subject, activity, school_id)
        observed_units, observed_minutes = self._observed(student_id, subject, activity)

        blended = (observed_minutes + PRIOR_STRENGTH_UNITS * prior) / (
            observed_units + PRIOR_STRENGTH_UNITS
        )
        blended = max(MIN_MINUTES_PER_UNIT, min(MAX_MINUTES_PER_UNIT, blended))
        blended /= self._efficiency_factor(student_id, subject)

        return WorkloadEstimate(
            minutes=max(1, round(blended * units)),
            confidence=observed_units / (observed_units + PRIOR_STRENGTH_UNITS),
            minutes_per_unit=blended,
            observed_units=observed_units,
        )

    # ---------- سابقه‌ی واقعی ----------

    @staticmethod
    def _observed(student_id: int, subject: str, activity: ActivityKind) -> tuple[int, float]:
        row = (
            StudySession.objects
            .filter(
                user_id=student_id,
                subject__name=subject,
                mode=activity.value,
                count_test__gt=0,
            )
            .aggregate(units=Sum('count_test'), seconds=Sum('duration_seconds'))
        )
        units = int(row['units'] or 0)
        minutes = float(row['seconds'] or 0) / 60.0
        if units <= 0 or minutes <= 0:
            return 0, 0.0
        return units, minutes

    # ---------- prior ----------

    @staticmethod
    def _prior_minutes_per_unit(
        subject: str, activity: ActivityKind, school_id: int | None,
    ) -> float:
        profile = (
            m.SubjectProfileModel.objects
            .filter(school_id=school_id, name=subject)
            .only('tags', 'baseline_units_per_hour')
            .first()
            if school_id is not None else None
        )
        if profile is not None and profile.baseline_units_per_hour > 0:
            return 60.0 / profile.baseline_units_per_hour

        base = _PRIOR_BY_ACTIVITY.get(activity, DEFAULT_PRIOR_MINUTES_PER_UNIT)
        tags = set(profile.tags or ()) if profile is not None else set()
        for tag, multiplier in _TAG_MULTIPLIER.items():
            if tag.value in tags:
                return base * multiplier
        return base

    # ---------- بازدهی ----------

    def _efficiency_factor(self, student_id: int, subject: str) -> float:
        if self._efficiency is None:
            return 1.0
        return self._efficiency.get(student_id).for_subject(subject)
