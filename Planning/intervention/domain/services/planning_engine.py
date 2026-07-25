"""PlanningEngine — هسته‌ی برنامه‌ریزی گروهی (Domain Service خالص).

هیچ import ای از Django، DRF، مخزن یا ساعت سیستم اینجا نیست. ورودی: پارامترهای
مشاور + رویدادهای موجود هر دانش‌آموز. خروجی: پیش‌نمایش درون‌حافظه. نتیجه‌اش کاملاً
دترمینیستیک است (هیچ رندومی در کار نیست)، پس با ورودی یکسان همیشه همان برنامه
تولید می‌شود و تست‌هایش بدون دیتابیس اجرا می‌شوند.

قواعدی که موتور رعایت می‌کند:
  • فقط فضاهای خالی پر می‌شوند؛ هیچ رویداد موجودی (ثابت یا غیر ثابت) بازنویسی
    نمی‌شود. تصمیم صریح کارفرما بود و ظرفیت را برابر «پنجره‌ی بیداری منهای همه‌ی
    رویدادهای موجود» می‌کند.
  • بین بلوک‌ها استراحت گذاشته می‌شود؛ طول بلوک و استراحت از سطح فشردگی می‌آید.
  • سقف مطالعه‌ی هر درس (قید فرسودگی) پیش از چیدمان اعمال می‌شود.
  • تقسیم زمان بین درس‌ها یا صریح است یا از ``SubjectWeightCalculator`` می‌آید.

الگوریتم چیدمان «حریصانه‌ی متعادل» است: در هر نوبت، درسی انتخاب می‌شود که بیشترین
کسری را دارد. نتیجه این می‌شود که درس‌ها به‌جای تلنبار شدن در یک روز، در طول بازه
پخش می‌شوند — بدون اینکه لازم باشد قاعده‌ی جداگانه‌ای برای «پخش‌کردن» بنویسیم.
"""
from __future__ import annotations

from collections import defaultdict
from typing import Mapping, Sequence

from ....scheduling.domain.entities.calendar_event import CalendarEvent
from ....scheduling.domain.entities.day_agenda import DayAgenda, group_by_date
from ....scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ..entities.plan_draft import (
    PlanPreview,
    PlanWarning,
    StudentPlanDraft,
    format_minutes,
)
from ..entities.plan_request import PlanRequest
from ..enums import PlanWarningCode
from ..ports.burnout_policy import BurnoutPolicy
from ..ports.subject_weight_calculator import SubjectWeightCalculator
from ..value_objects.break_policy import BreakPolicy
from ..value_objects.planned_block import PlannedBlock
from ..value_objects.subject_quota import SubjectQuota

#: کوتاه‌ترین بلوکی که ارزش گذاشتن دارد. باقی‌مانده‌ی کمتر از این، فقط اگر آخرین
#: تکه‌ی یک درس باشد گذاشته می‌شود تا مجموع دقیقاً به سهمیه برسد.
MIN_BLOCK_MINUTES = 30
MIN_TAIL_MINUTES = 15
#: گِرد کردن سهمیه‌های وزنی به پله‌های ۵ دقیقه‌ای (اعداد خوانا برای مشاور).
QUOTA_STEP_MINUTES = 5


class PlanningEngine:
    def __init__(
        self,
        *,
        weights: SubjectWeightCalculator,
        burnout: BurnoutPolicy,
        awake_window: AwakeWindowPolicy | None = None,
    ) -> None:
        self._weights = weights
        self._burnout = burnout
        self._awake = awake_window or AwakeWindowPolicy.default()

    def plan(
        self,
        request: PlanRequest,
        *,
        existing_events: Mapping[int, Sequence[CalendarEvent]],
    ) -> PlanPreview:
        """ساخت پیش‌نمایش برای همه‌ی دانش‌آموزان.

        کلیدهای ``existing_events`` فهرست دانش‌آموزان است؛ دانش‌آموز بدون رویداد هم
        باید کلید داشته باشد (با لیست خالی) وگرنه در برنامه دیده نمی‌شود.
        """
        drafts = tuple(
            self._plan_student(request, student_id, existing_events[student_id])
            for student_id in sorted(existing_events)
        )
        return PlanPreview(window=request.window, intensity=request.intensity, drafts=drafts)

    # ---------- برنامه‌ی یک دانش‌آموز ----------

    def _plan_student(
        self, request: PlanRequest, student_id: int, events: Sequence[CalendarEvent],
    ) -> StudentPlanDraft:
        policy = BreakPolicy.for_level(request.intensity)
        quotas, warnings = self._resolve_quotas(request, student_id)
        agendas = self._agendas(student_id, request, events)
        capacity = self._capacity_minutes(agendas, policy)

        remaining = {quota.subject: quota.minutes for quota in quotas}
        allocated: dict[str, int] = defaultdict(int)
        blocks: list[PlannedBlock] = []

        for date in request.window.days():
            daily_left = {
                subject: self._burnout.max_daily_minutes(subject) for subject in remaining
            }
            for gap in agendas[date].free_slots(min_duration=MIN_TAIL_MINUTES):
                cursor = gap.start_minutes
                while cursor < gap.end_minutes:
                    choice = self._choose(
                        remaining, daily_left, gap.end_minutes - cursor, policy,
                    )
                    if choice is None:
                        break
                    subject, duration = choice
                    blocks.append(
                        PlannedBlock(
                            date=date,
                            slot=TimeRange.of_duration(cursor, duration),
                            subject=subject,
                        )
                    )
                    remaining[subject] -= duration
                    allocated[subject] += duration
                    if daily_left[subject] is not None:
                        daily_left[subject] -= duration
                    cursor += duration + policy.break_minutes

        draft = StudentPlanDraft(
            student_id=student_id,
            blocks=tuple(blocks),
            quotas=tuple(quotas),
            allocated_by_subject=dict(allocated),
            capacity_minutes=capacity,
            warnings=warnings,
        )
        return self._with_deadlock_warnings(draft)

    # ---------- سهمیه‌ها ----------

    def _resolve_quotas(
        self, request: PlanRequest, student_id: int,
    ) -> tuple[list[SubjectQuota], tuple[PlanWarning, ...]]:
        base = (
            list(request.quotas) if request.quotas
            else self._weighted_quotas(request, student_id)
        )

        capped: list[SubjectQuota] = []
        warnings: list[PlanWarning] = []
        for quota in base:
            ceiling = self._burnout.max_window_minutes(quota.subject)
            if ceiling is not None and quota.minutes > ceiling:
                warnings.append(
                    PlanWarning(
                        code=PlanWarningCode.BURNOUT_CAP,
                        message=(
                            f'زمان درخواستی «{quota.subject}» به سقف مجاز '
                            f'{format_minutes(ceiling)} کاهش یافت.'
                        ),
                        meta={
                            'subject': quota.subject,
                            'requested_minutes': quota.minutes,
                            'capped_minutes': ceiling,
                        },
                    )
                )
                capped.append(quota.with_minutes(ceiling))
            else:
                capped.append(quota)
        return capped, tuple(warnings)

    def _weighted_quotas(self, request: PlanRequest, student_id: int) -> list[SubjectQuota]:
        raw = self._weights.weights(student_id=student_id, subjects=request.subjects)
        weights = {
            subject: max(float(raw.get(subject, 0.0)), 0.0) for subject in request.subjects
        }
        if sum(weights.values()) <= 0:
            weights = {subject: 1.0 for subject in request.subjects}
        return _split_minutes(request.total_minutes, weights)

    # ---------- چیدمان ----------

    def _agendas(
        self, student_id: int, request: PlanRequest, events: Sequence[CalendarEvent],
    ) -> dict[JalaliDate, DayAgenda]:
        by_date = group_by_date(list(events))
        return {
            date: DayAgenda.build(student_id, date, by_date.get(date, []), policy=self._awake)
            for date in request.window.days()
        }

    def _capacity_minutes(
        self, agendas: Mapping[JalaliDate, DayAgenda], policy: BreakPolicy,
    ) -> int:
        """ظرفیت واقعی: همان حلقه‌ی چیدمان با تقاضای بی‌نهایت.

        محاسبه‌ی ساده‌ی «مجموع دقایق خالی» عدد را بیش‌برآورد می‌کند، چون استراحت‌ها و
        شکاف‌های خیلی کوچک قابل استفاده نیستند و آن‌وقت هشدار کسری با واقعیت
        نمی‌خواند. با شبیه‌سازی همان حلقه، عدد گزارش‌شده دقیقاً همان چیزی است که
        الگوریتم می‌تواند استفاده کند.
        """
        total = 0
        for agenda in agendas.values():
            for gap in agenda.free_slots(min_duration=MIN_BLOCK_MINUTES):
                cursor = gap.start_minutes
                while cursor + MIN_BLOCK_MINUTES <= gap.end_minutes:
                    duration = min(policy.study_minutes, gap.end_minutes - cursor)
                    total += duration
                    cursor += duration + policy.break_minutes
        return total

    @staticmethod
    def _choose(
        remaining: Mapping[str, int],
        daily_left: Mapping[str, int | None],
        available: int,
        policy: BreakPolicy,
    ) -> tuple[str, int] | None:
        """درس بعدی و طول بلوکش؛ ``None`` یعنی در این فضا چیزی جا نمی‌شود.

        اولویت با درسی است که بیشترین کسری را دارد و در تساوی، ترتیب الفبایی —
        تا خروجی موتور کاملاً قابل بازتولید بماند.
        """
        best: tuple[str, int] | None = None
        best_key: tuple[int, str] | None = None
        for subject in sorted(remaining):
            left = remaining[subject]
            if left <= 0:
                continue
            ceiling = min(left, available)
            room_today = daily_left.get(subject)
            if room_today is not None:
                ceiling = min(ceiling, room_today)
            duration = min(policy.study_minutes, ceiling)
            # خرده‌ی کمتر از ۱۵ دقیقه به همان بلوک اضافه می‌شود تا بعداً بلوکی
            # به‌درد‌نخور (یا کسری الکی) تولید نشود.
            if 0 < left - duration < MIN_TAIL_MINUTES and ceiling >= left:
                duration = left
            if duration < min(MIN_BLOCK_MINUTES, left):
                continue
            key = (-left, subject)
            if best_key is None or key < best_key:
                best, best_key = (subject, duration), key
        return best

    # ---------- تشخیص بن‌بست ----------

    @staticmethod
    def _with_deadlock_warnings(draft: StudentPlanDraft) -> StudentPlanDraft:
        warnings = list(draft.warnings)
        if draft.capacity_minutes == 0:
            warnings.append(
                PlanWarning(
                    code=PlanWarningCode.NO_FREE_SPACE,
                    message='در این بازه هیچ فضای خالی قابل استفاده‌ای وجود ندارد.',
                    meta={'capacity_minutes': 0},
                )
            )
        if draft.shortfall_minutes > 0:
            warnings.append(
                PlanWarning(
                    code=PlanWarningCode.CAPACITY_SHORTFALL,
                    message=(
                        f'{format_minutes(draft.shortfall_minutes)} از برنامه‌ی درخواستی '
                        'به دلیل نبود فضای خالی جا نشد.'
                    ),
                    meta={
                        'shortfall_minutes': draft.shortfall_minutes,
                        'required_minutes': draft.required_minutes,
                        'allocated_minutes': draft.allocated_minutes,
                        'capacity_minutes': draft.capacity_minutes,
                    },
                )
            )
            for subject, minutes in sorted(draft.shortfall_by_subject().items()):
                warnings.append(
                    PlanWarning(
                        code=PlanWarningCode.SUBJECT_SHORTFALL,
                        message=f'«{subject}»: {format_minutes(minutes)} کسری دارد.',
                        meta={'subject': subject, 'shortfall_minutes': minutes},
                    )
                )
        if len(warnings) == len(draft.warnings):
            return draft
        return StudentPlanDraft(
            student_id=draft.student_id,
            blocks=draft.blocks,
            quotas=draft.quotas,
            allocated_by_subject=draft.allocated_by_subject,
            capacity_minutes=draft.capacity_minutes,
            warnings=tuple(warnings),
        )


def _split_minutes(total_minutes: int, weights: Mapping[str, float]) -> list[SubjectQuota]:
    """تقسیم زمان کل بین درس‌ها به نسبت وزن، با پله‌ی ۵ دقیقه‌ای و جمع دقیق.

    از روش «بزرگ‌ترین باقی‌مانده» استفاده می‌شود تا مجموع سهمیه‌ها دقیقاً برابر زمان
    درخواستی بماند (گرد کردن ساده، چند دقیقه گم یا اضافه می‌کند).
    """
    total_weight = sum(weights.values())
    units_total, leftover = divmod(total_minutes, QUOTA_STEP_MINUTES)

    exact = {
        subject: units_total * weight / total_weight for subject, weight in weights.items()
    }
    units = {subject: int(value) for subject, value in exact.items()}
    for subject in sorted(
        exact, key=lambda s: (-(exact[s] - units[s]), s),
    )[: units_total - sum(units.values())]:
        units[subject] += 1

    minutes = {
        subject: count * QUOTA_STEP_MINUTES for subject, count in units.items() if count > 0
    }
    if leftover and minutes:
        biggest = sorted(minutes, key=lambda s: (-minutes[s], s))[0]
        minutes[biggest] += leftover
    return [
        SubjectQuota(subject=subject, minutes=value)
        for subject, value in sorted(minutes.items())
    ]
