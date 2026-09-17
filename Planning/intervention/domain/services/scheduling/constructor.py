"""ساخت چیدمان اولیه: درج حریصانه بر اساس اولویت، با جابه‌جایی اجباری.

ترتیب درج بر اساس اولویت است نه بیشترین کسری. نتیجه‌اش این است که وقتی ظرفیت کم
می‌آید، چیزی که حذف می‌شود مرور جزئیِ P=1 است نه آزمون P=5 — دقیقاً همان رفتاری
که از «ضریب اولویت» انتظار می‌رود.

وقتی برای یک آیتم هیچ جای آزادی نمانده، سه راه به ترتیب امتحان می‌شود:

  ۱. **جابه‌جایی اجباری**: بلوک‌های شناور با اولویت اکیداً کمتر کنار می‌روند.
  ۲. **کوتاه‌سازی**: آیتم تا کف طول بلوکش کوچک می‌شود.
  ۳. **اعلام شکست**: هشدار ثبت می‌شود و آیتم بی‌جا می‌ماند.

قاعده‌ی طلایی جابه‌جایی: قربانی فقط وقتی کنار می‌رود که **جای جدیدی پیدا کند**. اگر
حتی یکی از قربانی‌ها بی‌خانمان بماند، کل عملیات برگردانده می‌شود. این یعنی موتور
هرگز کاری را که قبلاً به دانش‌آموز قول داده بود بی‌صدا حذف نمی‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Sequence

from .....scheduling.domain.value_objects.jalali_date import JalaliDate
from .....scheduling.domain.value_objects.time_range import TimeRange
from ...ports.efficiency_profile import EfficiencyProfile
from ...value_objects.schedule_item import ScheduleItem
from .candidates import SNAP_MINUTES, generate_candidates
from .cost import DEFAULT_WEIGHTS, CostWeights, placement_cost
from .state import Placement, ScheduleState

#: بیشترین تعداد بلوکی که برای باز کردن جا برای یک آیتم کنار زده می‌شود.
MAX_VICTIMS = 2
#: چند جایگاهِ نیازمند جابه‌جایی امتحان شود پیش از تسلیم.
MAX_EVICTION_ATTEMPTS = 3


@dataclass
class ConstructionResult:
    state: ScheduleState
    unplaced: list[ScheduleItem] = field(default_factory=list)
    shrunk: list[tuple[ScheduleItem, int]] = field(default_factory=list)
    evictions: list[tuple[str, str]] = field(default_factory=list)


def construct(
    state: ScheduleState,
    items: Sequence[ScheduleItem],
    *,
    weights: CostWeights = DEFAULT_WEIGHTS,
    profile: EfficiencyProfile | None = None,
) -> ConstructionResult:
    result = ConstructionResult(state=state)
    for item in sorted(items, key=_insertion_key):
        if _place_best(state, item, weights=weights, profile=profile):
            continue
        if _evict_and_place(state, item, result, weights=weights, profile=profile):
            continue
        if item.can_shrink:
            shrunk = item.shrunk_to_min()
            if _place_best(state, shrunk, weights=weights, profile=profile):
                result.shrunk.append((item, shrunk.duration_minutes))
                continue
        result.unplaced.append(item)
    return result


def _insertion_key(item: ScheduleItem) -> tuple:
    """اولویت بالا اول، بعد کار سنگین، بعد بلوک بلند.

    ``item_id`` در انتها می‌آید تا در تساوی کامل هم ترتیب قطعی باشد و خروجی موتور
    بین دو اجرا فرق نکند.
    """
    return (-item.priority, -item.cognitive_load, -item.duration_minutes, item.item_id)


# ---------- درج ساده ----------

def _place_best(
    state: ScheduleState,
    item: ScheduleItem,
    *,
    weights: CostWeights,
    profile: EfficiencyProfile | None,
    existing: Placement | None = None,
) -> bool:
    best = _best_candidate(state, item, weights=weights, profile=profile, existing=existing)
    if best is None:
        return False
    date, slot = best
    state.place(
        Placement(
            item=item,
            date=date,
            slot=slot,
            existing_client_id=existing.existing_client_id if existing else '',
            origin_date=existing.origin_date if existing else None,
            origin_slot=existing.origin_slot if existing else None,
        )
    )
    return True


def _best_candidate(
    state: ScheduleState,
    item: ScheduleItem,
    *,
    weights: CostWeights,
    profile: EfficiencyProfile | None,
    existing: Placement | None = None,
) -> tuple[JalaliDate, TimeRange] | None:
    best: tuple[JalaliDate, TimeRange] | None = None
    best_cost = float('inf')
    for candidate in generate_candidates(state, item):
        cost = placement_cost(
            state, item, candidate.date, candidate.slot,
            weights=weights, profile=profile, existing=existing,
        )
        if cost < best_cost:
            best, best_cost = (candidate.date, candidate.slot), cost
    return best


# ---------- جابه‌جایی اجباری ----------

def _evict_and_place(
    state: ScheduleState,
    item: ScheduleItem,
    result: ConstructionResult,
    *,
    weights: CostWeights,
    profile: EfficiencyProfile | None,
) -> bool:
    for date, slot, victims in _eviction_options(state, item)[:MAX_EVICTION_ATTEMPTS]:
        checkpoint = state.snapshot()
        for victim in victims:
            state.unplace(victim.item.item_id)
        if not state.fits(item, date, slot):
            state.restore(checkpoint)
            continue
        state.place(Placement(item=item, date=date, slot=slot))

        if _rehome_all(state, victims, weights=weights, profile=profile):
            result.evictions.extend(
                (victim.item.item_id, item.item_id) for victim in victims
            )
            return True
        state.restore(checkpoint)
    return False


def _rehome_all(
    state: ScheduleState,
    victims: Sequence[Placement],
    *,
    weights: CostWeights,
    profile: EfficiencyProfile | None,
) -> bool:
    """هر قربانی باید جای تازه پیدا کند، وگرنه کل جابه‌جایی باطل است."""
    for victim in sorted(victims, key=lambda p: _insertion_key(p.item)):
        placed = _place_best(
            state, victim.item, weights=weights, profile=profile,
            existing=victim if victim.is_existing else None,
        )
        if not placed:
            return False
    return True


def _eviction_options(
    state: ScheduleState, item: ScheduleItem,
) -> list[tuple[JalaliDate, TimeRange, tuple[Placement, ...]]]:
    """جایگاه‌هایی که فقط «آدم» سر راهشان است، نه دیوار.

    مرتب بر اساس ارزانیِ قربانی: اول کمترین تعداد، بعد کمترین مجموع اولویت، بعد
    بیشترین شناوری (بلوکی که ذاتاً برای جابه‌جا شدن علامت خورده).
    """
    duration = item.duration_minutes
    options: list[tuple[JalaliDate, TimeRange, tuple[Placement, ...]]] = []

    for date in state.days:
        if not item.allows_day(date):
            continue
        for gap in state.wall_gaps(date, min_duration=duration):
            latest = gap.end_minutes - duration
            for start in _starts(gap.start_minutes, latest):
                slot = TimeRange.of_duration(start, duration)
                victims = state.blockers(date, slot, item)
                if not victims or len(victims) > MAX_VICTIMS:
                    continue
                if not all(_can_evict(victim, item) for victim in victims):
                    continue
                options.append((date, slot, tuple(victims)))

    options.sort(key=lambda option: _eviction_rank(option, item))
    return options


def _starts(earliest: int, latest: int) -> list[int]:
    if latest < earliest:
        return []
    first_aligned = ((earliest + SNAP_MINUTES - 1) // SNAP_MINUTES) * SNAP_MINUTES
    return [earliest, *range(first_aligned, latest + 1, SNAP_MINUTES)]


def _can_evict(victim: Placement, challenger: ScheduleItem) -> bool:
    """شناوری تعیین می‌کند «می‌شود جابه‌جا کرد»، اولویت تعیین می‌کند «باید بشود»."""
    if victim.item.is_pinned:
        return False
    return victim.item.priority < challenger.priority


def _eviction_rank(
    option: tuple[JalaliDate, TimeRange, tuple[Placement, ...]], item: ScheduleItem,
) -> tuple:
    date, slot, victims = option
    return (
        len(victims),
        sum(victim.item.priority for victim in victims),
        -sum(victim.item.movability for victim in victims),
        date.to_gregorian().toordinal(),
        slot.start_minutes,
    )


__all__ = ['MAX_VICTIMS', 'ConstructionResult', 'construct']
