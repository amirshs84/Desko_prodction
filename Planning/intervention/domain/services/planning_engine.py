"""PlanningEngine — هسته‌ی برنامه‌ریزی گروهی (Domain Service خالص).

هیچ import ای از Django، DRF، مخزن یا ساعت سیستم اینجا نیست. ورودی: پارامترهای
مشاور + رویدادهای موجود هر دانش‌آموز. خروجی: پیش‌نمایش درون‌حافظه.

خط لوله سه مرحله است:

  ۱. **نرمال‌سازی تقاضا** — «۱۰۰ تست ریاضی» با نرخ واقعی همین دانش‌آموز به دقیقه
     تبدیل می‌شود، سقف فرسودگی اعمال می‌گردد، و هر سهمیه تگ و بار شناختی‌اش را از
     کاتالوگ درس مدرسه می‌گیرد. خروجی: فهرستی از آیتم‌های قابل جای‌گذاری.
  ۲. **ساخت اولیه** — درج حریصانه به ترتیب اولویت، با جابه‌جایی اجباریِ بلوک‌های
     کم‌اهمیت‌ترِ شناور وقتی جای خالی نمانده.
  ۳. **پالایش** — جست‌وجوی محلی که چیدمان را به‌عنوان یک کل می‌بیند و فقط حرکت‌های
     بهبوددهنده را می‌پذیرد.

مرحله‌ی دوم و سوم تصادف دارند، اما RNG از خود درخواست دانه می‌گیرد؛ پس همان ورودی
همیشه همان خروجی را می‌دهد و آنچه مشاور در پیش‌نمایش دید، همان چیزی است که منتشر
می‌شود.

قواعدی که موتور هرگز نقض نمی‌کند (قید سخت، در ``scheduling.state``):
  • رویداد ثابت مدرسه و هر رویدادِ دست‌ساز دانش‌آموز یا مشاور، دیوار است.
  • هیچ بلوکی بیرون از بازه‌ی فعالِ همان دانش‌آموز نمی‌نشیند.
  • بین دو بلوک، حداقل استراحتِ شکل بلوک رعایت می‌شود.
  • سقف روزانه‌ی هر درس (قید فرسودگی) شکسته نمی‌شود.
"""
from __future__ import annotations

import random
from collections import defaultdict
from typing import Mapping, Sequence

from ....scheduling.domain.entities.calendar_event import CalendarEvent
from ....scheduling.domain.entities.day_agenda import group_by_date
from ....scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ..entities.plan_draft import (
    BlockRelocation,
    PlanPreview,
    PlanWarning,
    StudentPlanDraft,
    format_minutes,
)
from ..entities.plan_request import PlanRequest
from ..enums import PlanWarningCode
from ..ports.burnout_policy import BurnoutPolicy
from ..ports.efficiency_profile import EfficiencyProfile, EfficiencyProfileReader
from ..ports.subject_catalog import SubjectCatalog
from ..ports.subject_weight_calculator import SubjectWeightCalculator
from ..ports.workload_estimator import WorkloadEstimator
from ..value_objects.intensity_profile import (
    MIN_TAIL_MINUTES,
    BlockShape,
    IntensityProfile,
)
from ..value_objects.planned_block import DEFAULT_BLOCK_COLOR, PlannedBlock
from ..value_objects.schedule_item import ScheduleItem
from ..value_objects.subject_profile import SubjectProfile
from ..value_objects.subject_quota import SubjectQuota
from ..value_objects.subject_tag import parse_tags
from .scheduling import Placement, ScheduleState, construct, refine
from .scheduling.cost import DEFAULT_WEIGHTS, CostWeights

#: گِرد کردن سهمیه‌های وزنی به پله‌های ۵ دقیقه‌ای (اعداد خوانا برای مشاور).
QUOTA_STEP_MINUTES = 5
#: زیر این اطمینان، تخمین «تعداد → دقیقه» به مشاور هشدار می‌دهد.
LOW_CONFIDENCE_THRESHOLD = 0.4
#: پیشوند شناسه‌ی آیتم‌ها، برای تفکیک کار جدید از بلوک‌های اجراهای قبلی.
NEW_ITEM_PREFIX = 'q'
EXISTING_ITEM_PREFIX = 'e'

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
        catalog: SubjectCatalog | None = None,
        workload: WorkloadEstimator | None = None,
        efficiency: EfficiencyProfileReader | None = None,
        cost_weights: CostWeights = DEFAULT_WEIGHTS,
        refine_iterations: int | None = None,
    ) -> None:
        self._weights = weights
        self._burnout = burnout
        self._awake = awake_window or AwakeWindowPolicy.default()
        self._catalog = catalog
        self._workload = workload
        self._efficiency = efficiency
        self._cost_weights = cost_weights
        self._refine_iterations = refine_iterations

    def plan(
        self,
        request: PlanRequest,
        *,
        existing_events: Mapping[int, Sequence[CalendarEvent]],
        awake_windows: Mapping[int, AwakeWindowPolicy] | None = None,
        school_id: int | None = None,
    ) -> PlanPreview:
        """ساخت پیش‌نمایش برای همه‌ی دانش‌آموزان.

        کلیدهای ``existing_events`` فهرست دانش‌آموزان است؛ دانش‌آموز بدون رویداد هم
        باید کلید داشته باشد (با لیست خالی) وگرنه در برنامه دیده نمی‌شود.
        """
        student_ids = sorted(existing_events)
        profiles = self._subject_profiles(request, school_id)
        efficiency = self._efficiency_profiles(student_ids)
        windows = awake_windows or {}

        drafts = tuple(
            self._plan_student(
                request,
                student_id,
                existing_events[student_id],
                policy=windows.get(student_id, self._awake),
                profiles=profiles,
                efficiency=efficiency.get(student_id),
                school_id=school_id,
            )
            for student_id in student_ids
        )
        return PlanPreview(window=request.window, intensity=request.intensity, drafts=drafts)

    # ---------- برنامه‌ی یک دانش‌آموز ----------

    def _plan_student(
        self,
        request: PlanRequest,
        student_id: int,
        events: Sequence[CalendarEvent],
        *,
        policy: AwakeWindowPolicy,
        profiles: Mapping[str, SubjectProfile],
        efficiency: EfficiencyProfile | None,
        school_id: int | None = None,
    ) -> StudentPlanDraft:
        intensity = IntensityProfile.for_level(request.intensity)
        quotas, warnings = self._resolve_quotas(request, student_id, profiles, school_id)

        days = tuple(request.window.days())
        walls, seeds = self._partition_events(days, events, intensity)
        state = ScheduleState(
            days=days, walls=walls, policy=policy, burnout=self._burnout,
        )
        for placement in seeds:
            state.place(placement)

        items = _build_items(quotas, intensity)
        result = construct(
            state, items, weights=self._cost_weights, profile=efficiency,
        )
        rng = random.Random(self._seed(student_id, request))
        refine(
            state,
            rng=rng,
            unplaced=result.unplaced,
            weights=self._cost_weights,
            profile=efficiency,
            **({} if self._refine_iterations is None
               else {'max_iterations': self._refine_iterations}),
        )

        return self._draft_from_state(
            student_id=student_id,
            state=state,
            quotas=quotas,
            unplaced=result.unplaced,
            shrunk=result.shrunk,
            warnings=warnings,
            default_shape=intensity.default_shape,
        )

    # ---------- مرحله ۱: نرمال‌سازی تقاضا ----------

    def _subject_profiles(
        self, request: PlanRequest, school_id: int | None,
    ) -> dict[str, SubjectProfile]:
        names = request.subject_names
        if self._catalog is None:
            return {name: SubjectProfile.fallback(name) for name in names}
        found = self._catalog.profiles_for(school_id=school_id, names=names)
        return {name: found.get(name) or SubjectProfile.fallback(name) for name in names}

    def _efficiency_profiles(self, student_ids: Sequence[int]) -> dict[int, EfficiencyProfile]:
        if self._efficiency is None or not student_ids:
            return {}
        return self._efficiency.get_many(student_ids)

    def _resolve_quotas(
        self,
        request: PlanRequest,
        student_id: int,
        profiles: Mapping[str, SubjectProfile],
        school_id: int | None = None,
    ) -> tuple[list[SubjectQuota], tuple[PlanWarning, ...]]:
        warnings: list[PlanWarning] = []
        base = (
            self._weighted_quotas(request, student_id, profiles)
            if request.is_weight_based
            else self._demand_quotas(request, student_id, profiles, warnings, school_id)
        )
        return self._apply_burnout_caps(base, warnings), tuple(warnings)

    def _demand_quotas(
        self,
        request: PlanRequest,
        student_id: int,
        profiles: Mapping[str, SubjectProfile],
        warnings: list[PlanWarning],
        school_id: int | None,
    ) -> list[SubjectQuota]:
        quotas: list[SubjectQuota] = []
        for demand in request.demands:
            profile = profiles.get(demand.subject) or SubjectProfile.fallback(demand.subject)
            minutes, units, confidence = self._demand_minutes(
                demand, student_id, warnings, school_id,
            )
            quotas.append(
                SubjectQuota(
                    subject=demand.subject,
                    minutes=minutes,
                    priority=demand.resolved_priority(profile),
                    movability=demand.resolved_movability(profile),
                    activity=demand.activity,
                    tags=profile.tags,
                    cognitive_load=profile.cognitive_load,
                    requested_units=units,
                    estimate_confidence=confidence,
                )
            )
        return quotas

    def _demand_minutes(
        self,
        demand,
        student_id: int,
        warnings: list[PlanWarning],
        school_id: int | None,
    ) -> tuple[int, int, float]:
        if demand.is_time_based:
            return demand.amount, 0, 1.0
        if self._workload is None:
            raise ValueError(
                'تقاضای تعدادی بدون تخمین‌گر حجم کار قابل برنامه‌ریزی نیست.'
            )
        estimate = self._workload.estimate(
            student_id=student_id,
            subject=demand.subject,
            activity=demand.activity,
            units=demand.amount,
            school_id=school_id,
        )
        if estimate.confidence < LOW_CONFIDENCE_THRESHOLD:
            warnings.append(
                PlanWarning(
                    code=PlanWarningCode.LOW_CONFIDENCE_ESTIMATE,
                    message=(
                        f'تخمین زمان «{demand.subject}» بر پایه‌ی میانگین است، نه سابقه‌ی '
                        f'این دانش‌آموز: {demand.amount} مورد ≈ '
                        f'{format_minutes(estimate.minutes)}.'
                    ),
                    meta={
                        'subject': demand.subject,
                        'units': demand.amount,
                        'estimated_minutes': estimate.minutes,
                        'confidence': round(estimate.confidence, 2),
                        'minutes_per_unit': round(estimate.minutes_per_unit, 2),
                    },
                )
            )
        return estimate.minutes, demand.amount, estimate.confidence

    def _weighted_quotas(
        self,
        request: PlanRequest,
        student_id: int,
        profiles: Mapping[str, SubjectProfile],
    ) -> list[SubjectQuota]:
        raw = self._weights.weights(student_id=student_id, subjects=request.subjects)
        weights = {
            subject: max(float(raw.get(subject, 0.0)), 0.0) for subject in request.subjects
        }
        if sum(weights.values()) <= 0:
            weights = {subject: 1.0 for subject in request.subjects}
        return _split_minutes(request.total_minutes, weights, profiles)

    def _apply_burnout_caps(
        self, quotas: Sequence[SubjectQuota], warnings: list[PlanWarning],
    ) -> list[SubjectQuota]:
        capped: list[SubjectQuota] = []
        for quota in quotas:
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
        return capped

    # ---------- مرحله ۲: آماده‌سازی فضا ----------

    def _partition_events(
        self,
        days: Sequence[JalaliDate],
        events: Sequence[CalendarEvent],
        intensity: IntensityProfile,
    ) -> tuple[dict[JalaliDate, list[TimeRange]], list[Placement]]:
        """تفکیک «دیوار» از «بلوک قابل جابه‌جایی».

        فقط بلوک‌هایی که خود موتور در اجراهای قبلی ساخته و شناوری‌شان صفر نیست
        قابل جابه‌جایی‌اند. هر چیز دیگری — کلاس مدرسه، قرار شخصی، بلوکی که مشاور با
        دست گذاشته — دیوار است، حتی اگر از نظر تقویم «قابل ویرایش» باشد.
        """
        by_date = group_by_date(list(events))
        walls: dict[JalaliDate, list[TimeRange]] = {day: [] for day in days}
        seeds: list[Placement] = []

        for day in days:
            for event in by_date.get(day, []):
                if event.all_day or not event.is_relocatable_by_engine:
                    walls[day].append(event.slot)
                    continue
                seeds.append(_placement_from_event(event, day, intensity))
        return walls, seeds

    # ---------- مرحله ۳: تبدیل وضعیت به پیش‌نویس ----------

    def _draft_from_state(
        self,
        *,
        student_id: int,
        state: ScheduleState,
        quotas: Sequence[SubjectQuota],
        unplaced: Sequence[ScheduleItem],
        shrunk: Sequence[tuple[ScheduleItem, int]],
        warnings: Sequence[PlanWarning],
        default_shape: BlockShape,
    ) -> StudentPlanDraft:
        blocks: list[PlannedBlock] = []
        relocations: list[BlockRelocation] = []
        allocated: dict[str, int] = defaultdict(int)

        for placement in state.placements:
            if placement.is_existing:
                if placement.has_moved:
                    relocations.append(
                        BlockRelocation(
                            client_id=placement.existing_client_id,
                            subject=placement.item.subject,
                            date=placement.date,
                            slot=placement.slot,
                            from_date=placement.origin_date,
                            from_slot=placement.origin_slot,
                        )
                    )
                continue
            blocks.append(
                PlannedBlock.from_item(
                    placement.item, date=placement.date, slot=placement.slot,
                )
            )
            allocated[placement.item.subject] += placement.minutes

        blocks.sort(key=lambda block: (block.date.to_gregorian(), block.slot.start_minutes))
        relocations.sort(key=lambda move: (move.date.to_gregorian(), move.slot.start_minutes))

        draft = StudentPlanDraft(
            student_id=student_id,
            blocks=tuple(blocks),
            quotas=tuple(quotas),
            allocated_by_subject=dict(allocated),
            capacity_minutes=state.capacity_minutes(
                default_shape.study_minutes, default_shape.break_minutes,
            ),
            warnings=tuple(warnings) + _placement_warnings(unplaced, shrunk),
            relocations=tuple(relocations),
        )
        return _with_deadlock_warnings(draft)

    # ---------- دترمینیسم ----------

    @staticmethod
    def _seed(student_id: int, request: PlanRequest) -> str:
        start, end = request.window.start, request.window.end
        demand_signature = ','.join(
            f'{demand.subject}:{demand.unit.value}:{demand.amount}'
            for demand in sorted(request.demands, key=lambda item: item.subject)
        ) or ','.join(sorted(request.subject_names))
        return (
            f'{student_id}:{start.jy}-{start.jm}-{start.jd}:'
            f'{end.jy}-{end.jm}-{end.jd}:{request.intensity.value}:'
            f'{request.requested_minutes}:{demand_signature}'
        )


# ---------- توابع کمکی خالص ----------

def _build_items(
    quotas: Sequence[SubjectQuota], intensity: IntensityProfile,
) -> list[ScheduleItem]:
    """شکستن هر سهمیه به آیتم‌های قابل جای‌گذاری، با شکل بلوکِ متناسب با تگ درس."""
    items: list[ScheduleItem] = []
    for quota in quotas:
        shape = intensity.shape_for(quota.tags)
        for index, minutes in enumerate(_chunk_minutes(quota.minutes, shape)):
            items.append(
                ScheduleItem(
                    item_id=f'{NEW_ITEM_PREFIX}:{quota.subject}:{index}',
                    subject=quota.subject,
                    duration_minutes=minutes,
                    shape=shape,
                    priority=quota.priority,
                    movability=quota.movability,
                    activity=quota.activity,
                    tags=quota.tags,
                    cognitive_load=quota.cognitive_load,
                    color=_color_for(quota.subject, index),
                )
            )
    return items


def _chunk_minutes(total: int, shape: BlockShape) -> list[int]:
    """تقسیم دقایق یک درس به بلوک‌ها.

    خرده‌ی کمتر از ۱۵ دقیقه به بلوک قبلی چسبانده می‌شود؛ بلوک ۱۰ دقیقه‌ای نه برای
    دانش‌آموز مفید است نه ارزش اشغال یک شکاف را دارد.
    """
    chunks: list[int] = []
    remaining = total
    while remaining > 0:
        take = min(shape.study_minutes, remaining)
        rest = remaining - take
        if 0 < rest < MIN_TAIL_MINUTES:
            take += rest
            rest = 0
        chunks.append(take)
        remaining = rest
    return chunks


def _placement_from_event(
    event: CalendarEvent, date: JalaliDate, intensity: IntensityProfile,
) -> Placement:
    tags = parse_tags(event.subject_tags)
    shape = intensity.shape_for(tags)
    item = ScheduleItem(
        item_id=f'{EXISTING_ITEM_PREFIX}:{event.client_id}',
        subject=event.title,
        duration_minutes=event.slot.duration_minutes,
        shape=shape,
        priority=event.priority,
        movability=event.movability,
        tags=tags,
        cognitive_load=event.cognitive_load,
        color=event.color,
    )
    return Placement(
        item=item,
        date=date,
        slot=event.slot,
        existing_client_id=event.client_id,
        origin_date=date,
        origin_slot=event.slot,
    )


def _placement_warnings(
    unplaced: Sequence[ScheduleItem], shrunk: Sequence[tuple[ScheduleItem, int]],
) -> tuple[PlanWarning, ...]:
    warnings: list[PlanWarning] = []
    for item, minutes in sorted(shrunk, key=lambda pair: pair[0].item_id):
        warnings.append(
            PlanWarning(
                code=PlanWarningCode.ITEM_SHRUNK,
                message=(
                    f'یک بلوک «{item.subject}» برای جا شدن از '
                    f'{format_minutes(item.duration_minutes)} به '
                    f'{format_minutes(minutes)} کوتاه شد.'
                ),
                meta={
                    'subject': item.subject,
                    'from_minutes': item.duration_minutes,
                    'to_minutes': minutes,
                    'priority': item.priority,
                },
            )
        )
    for item in sorted(unplaced, key=lambda entry: entry.item_id):
        warnings.append(
            PlanWarning(
                code=PlanWarningCode.UNPLACEABLE_ITEM,
                message=(
                    f'یک بلوک «{item.subject}» به طول '
                    f'{format_minutes(item.duration_minutes)} جایی برای نشستن پیدا نکرد.'
                ),
                meta={
                    'subject': item.subject,
                    'minutes': item.duration_minutes,
                    'priority': item.priority,
                },
            )
        )
    return tuple(warnings)


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
        relocations=draft.relocations,
    )


def _color_for(subject: str, sequence: int) -> str:
    if not BLOCK_COLORS:
        return DEFAULT_BLOCK_COLOR
    base = sum(ord(ch) for ch in subject) % len(BLOCK_COLORS)
    return BLOCK_COLORS[(base + sequence) % len(BLOCK_COLORS)]


def _split_minutes(
    total_minutes: int,
    weights: Mapping[str, float],
    profiles: Mapping[str, SubjectProfile],
) -> list[SubjectQuota]:
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

    quotas: list[SubjectQuota] = []
    for subject, value in sorted(minutes.items()):
        profile = profiles.get(subject) or SubjectProfile.fallback(subject)
        quotas.append(
            SubjectQuota(
                subject=subject,
                minutes=value,
                priority=profile.default_priority,
                movability=profile.default_movability,
                tags=profile.tags,
                cognitive_load=profile.cognitive_load,
            )
        )
    return quotas
