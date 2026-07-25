"""PlanningEngine — هسته‌ی برنامه‌ریزی گروهی (Domain Service خالص).

هیچ import ای از Django، DRF، مخزن یا ساعت سیستم اینجا نیست. ورودی: پارامترهای
مشاور + رویدادهای موجود هر دانش‌آموز. خروجی: پیش‌نمایش درون‌حافظه.

خروجی با ورودی یکسان دترمینیستیک است؛ رندوم بودن با ``random.Random`` seeded
(بر اساس دانش‌آموز و بازه) است تا برنامه طبیعی‌تر به نظر برسد ولی قابل بازتولید بماند.

قواعدی که موتور رعایت می‌کند:
  • فقط فضاهای خالی پر می‌شوند؛ هیچ رویداد موجودی بازنویسی نمی‌شود.
  • بین بلوک‌ها استراحت گذاشته می‌شود؛ طول بلوک و استراحت از سطح فشردگی می‌آید.
  • سقف مطالعه‌ی هر درس (قید فرسودگی) پیش از چیدمان اعمال می‌شود.
  • تقسیم زمان بین درس‌ها یا صریح است یا از ``SubjectWeightCalculator`` می‌آید.
  • چیدمان round-robin روی روزهای بازه است تا بلوک‌ها در طول هفته پخش شوند.
  • هر بلوک رنگ متمایز می‌گیرد (پالت چرخشی بر اساس درس + ترتیب).
"""
from __future__ import annotations

import random
from collections import defaultdict
from typing import Mapping, Sequence

from ....scheduling.domain.entities.calendar_event import CalendarEvent
from ....scheduling.domain.entities.day_agenda import DayAgenda, group_by_date
from ....scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from ....scheduling.domain.services.free_slot_finder import free_gaps
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
from ..value_objects.planned_block import DEFAULT_BLOCK_COLOR, PlannedBlock
from ..value_objects.subject_quota import SubjectQuota

#: کوتاه‌ترین بلوکی که ارزش گذاشتن دارد. باقی‌مانده‌ی کمتر از این، فقط اگر آخرین
#: تکه‌ی یک درس باشد گذاشته می‌شود تا مجموع دقیقاً به سهمیه برسد.
MIN_BLOCK_MINUTES = 30
MIN_TAIL_MINUTES = 15
#: گِرد کردن سهمیه‌های وزنی به پله‌های ۵ دقیقه‌ای (اعداد خوانا برای مشاور).
QUOTA_STEP_MINUTES = 5
#: پله‌ی جابه‌جایی شروع داخل شکاف خالی (دقایق).
START_SNAP_MINUTES = 15
#: حداکثر جابه‌جایی تصادفی از ابتدای شکاف (تعداد پله‌ی ۱۵ دقیقه‌ای).
MAX_START_JITTER_SLOTS = 4

BLOCK_COLORS = (
    '#10b981',  # emerald
    '#3b82f6',  # blue
    '#f59e0b',  # amber
    '#ef4444',  # red
    '#8b5cf6',  # violet
    '#ec4899',  # pink
    '#14b8a6',  # teal
    '#f97316',  # orange
    '#06b6d4',  # cyan
    '#84cc16',  # lime
)


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
        days = list(request.window.days())
        daily_left = {
            date: {
                subject: self._burnout.max_daily_minutes(subject) for subject in remaining
            }
            for date in days
        }
        reserved: dict[JalaliDate, list[TimeRange]] = defaultdict(list)

        rng = random.Random(self._seed(student_id, request))
        if days:
            rot = rng.randint(0, len(days) - 1)
            day_order = days[rot:] + days[:rot]
        else:
            day_order = []

        idle_rounds = 0
        while sum(remaining.values()) > 0 and day_order and idle_rounds < len(day_order):
            placed_any = False
            for date in day_order:
                if sum(remaining.values()) <= 0:
                    break
                placed = self._place_one(
                    agendas[date],
                    reserved[date],
                    remaining,
                    daily_left[date],
                    policy,
                    rng,
                    sequence=len(blocks),
                )
                if placed is None:
                    continue
                block, pads = placed
                blocks.append(block)
                remaining[block.subject] -= block.minutes
                allocated[block.subject] += block.minutes
                room = daily_left[date][block.subject]
                if room is not None:
                    daily_left[date][block.subject] = room - block.minutes
                reserved[date].extend(pads)
                reserved[date].append(block.slot)
                break_end = min(
                    agendas[date].policy.window.end_minutes,
                    block.slot.end_minutes + policy.break_minutes,
                )
                if break_end > block.slot.end_minutes:
                    reserved[date].append(TimeRange(block.slot.end_minutes, break_end))
                placed_any = True
            if placed_any:
                idle_rounds = 0
            else:
                idle_rounds += 1

        blocks.sort(key=lambda b: (b.date.to_gregorian(), b.slot.start_minutes))
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
        """ظرفیت واقعی: شبیه‌سازی پر کردن شکاف‌ها با بلوک و استراحت."""
        total = 0
        for agenda in agendas.values():
            for gap in agenda.free_slots(min_duration=MIN_BLOCK_MINUTES):
                cursor = gap.start_minutes
                while cursor + MIN_BLOCK_MINUTES <= gap.end_minutes:
                    duration = min(policy.study_minutes, gap.end_minutes - cursor)
                    total += duration
                    cursor += duration + policy.break_minutes
        return total

    def _place_one(
        self,
        agenda: DayAgenda,
        reserved: Sequence[TimeRange],
        remaining: Mapping[str, int],
        daily_left: Mapping[str, int | None],
        policy: BreakPolicy,
        rng: random.Random,
        *,
        sequence: int,
    ) -> tuple[PlannedBlock, list[TimeRange]] | None:
        """یک بلوک در زودترین شکاف خالی؛ خروجی: بلوک + بازه‌های رزرو اضافه (پد شروع).

        برای جلوگیری از تکه‌تکه شدن، همیشه از ابتدای شکاف می‌چینیم. فقط اولین
        بلوک هر روز می‌تواند با jitter کمی دیرتر شروع شود؛ فضای قبلش رزرو می‌شود
        تا بعداً بلوک خرد داخل حفره ننشیند.
        """
        busy = list(agenda.busy_ranges()) + list(reserved)
        gaps = free_gaps(
            agenda.policy.window, busy, min_duration=MIN_TAIL_MINUTES,
        )
        if not gaps:
            return None

        gap = gaps[0]
        available = gap.end_minutes - gap.start_minutes
        choice = self._choose(remaining, daily_left, available, policy)
        if choice is None:
            return None
        subject, duration = choice

        pads: list[TimeRange] = []
        first_on_day = not reserved
        if first_on_day:
            start = self._pick_start(gap, duration, rng)
        else:
            start = gap.start_minutes
        if start is None:
            return None
        if start > gap.start_minutes:
            pads.append(TimeRange(gap.start_minutes, start))

        block = PlannedBlock(
            date=agenda.date,
            slot=TimeRange.of_duration(start, duration),
            subject=subject,
            color=_color_for(subject, sequence),
        )
        return block, pads

    @staticmethod
    def _pick_start(gap: TimeRange, duration: int, rng: random.Random) -> int | None:
        latest = gap.end_minutes - duration
        if latest < gap.start_minutes:
            return None
        starts = list(range(gap.start_minutes, latest + 1, START_SNAP_MINUTES))
        if not starts:
            return gap.start_minutes
        jitter = min(len(starts), 1 + rng.randint(0, MAX_START_JITTER_SLOTS))
        return rng.choice(starts[:jitter])

    @staticmethod
    def _seed(student_id: int, request: PlanRequest) -> str:
        start, end = request.window.start, request.window.end
        subjects = ','.join(sorted(request.subject_names))
        return (
            f'{student_id}:{start.jy}-{start.jm}-{start.jd}:'
            f'{end.jy}-{end.jm}-{end.jd}:{request.intensity.value}:'
            f'{request.requested_minutes}:{subjects}'
        )

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


def _color_for(subject: str, sequence: int) -> str:
    if not BLOCK_COLORS:
        return DEFAULT_BLOCK_COLOR
    base = sum(ord(ch) for ch in subject) % len(BLOCK_COLORS)
    return BLOCK_COLORS[(base + sequence) % len(BLOCK_COLORS)]


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
