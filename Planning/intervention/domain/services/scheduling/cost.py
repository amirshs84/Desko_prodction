"""تابع هزینه — تنها جایی که «چیدمان خوب» تعریف می‌شود.

قیدهای سخت در ``state`` اعمال می‌شوند و اصلاً به اینجا نمی‌رسند. آنچه اینجاست
ترجیح است نه قانون: هزینه‌ی کمتر یعنی چیدمان بهتر، و الگوریتم صرفاً کمینه‌اش
می‌کند.

هشت جمله داریم و هر کدام مستقل و قابل تست است:

  C1 تقاضای برآورده‌نشده، وزن‌دار با مجذور اولویت
  C2 مجاورت شناختی: دو بلوک سنگین چسبیده به هم
  C3 تکرار یک درس پشت سر هم
  C4 نابرابری بار روزانه
  C5 تناسب ساعت روز با جنس کار و نیم‌رخ شخصی دانش‌آموز
  C6 جابه‌جا کردن بلوکی که از قبل روی تقویم بوده
  C7 تکه‌تکه شدن روز (شکاف باقی‌مانده‌ی بی‌مصرف)
  C8 تأخیر از ددلاین

وزن‌ها ثابت‌های نام‌دارند تا تنظیمشان یک تغییر عدد باشد، نه بازنویسی منطق.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from .....scheduling.domain.value_objects.jalali_date import JalaliDate
from .....scheduling.domain.value_objects.time_range import TimeRange
from ...ports.efficiency_profile import EfficiencyProfile
from ...value_objects.schedule_item import ScheduleItem
from .state import Placement, ScheduleState

#: استراحت اضافه‌ای که بین دو بلوک سنگین *ترجیح* داده می‌شود (فراتر از حداقل سخت).
HEAVY_ADJACENCY_EXTRA_BREAK = 15
#: شکاف کوچک‌تر از این، عملاً هدررفت است.
USABLE_GAP_MINUTES = 30


@dataclass(frozen=True)
class CostWeights:
    unmet_demand: float = 1000.0
    heavy_adjacency: float = 60.0
    same_subject_streak: float = 25.0
    day_imbalance: float = 0.35
    time_of_day: float = 40.0
    displacement: float = 80.0
    fragmentation: float = 0.6
    deadline: float = 200.0


DEFAULT_WEIGHTS = CostWeights()

#: منحنی هوشیاری پیش‌فرض بر حسب ساعت شروع. مبنای C5 وقتی دانش‌آموز هنوز بازخوردی
#: ثبت نکرده است؛ به‌محض جمع شدن بازخورد، نیم‌رخ شخصی روی این غالب می‌شود.
_ALERTNESS = {
    **{hour: 0.55 for hour in range(0, 7)},
    7: 0.95, 8: 1.0, 9: 1.0, 10: 0.95, 11: 0.85,
    12: 0.65, 13: 0.6, 14: 0.75, 15: 0.85, 16: 0.85,
    17: 0.8, 18: 0.75, 19: 0.7, 20: 0.65, 21: 0.6,
    22: 0.5, 23: 0.45,
}


def alertness_at(start_minutes: int) -> float:
    return _ALERTNESS.get(start_minutes // 60, 0.5)


# ---------- هزینه‌ی یک جایگاه (افزایشی) ----------

def placement_cost(
    state: ScheduleState,
    item: ScheduleItem,
    date: JalaliDate,
    slot: TimeRange,
    *,
    weights: CostWeights = DEFAULT_WEIGHTS,
    profile: EfficiencyProfile | None = None,
    exclude_item_id: str = '',
    existing: Placement | None = None,
) -> float:
    """هزینه‌ی افزودن این آیتم در این جایگاه، بدون محاسبه‌ی دوباره‌ی کل چیدمان.

    سازنده و پالایشگر هزاران بار این را صدا می‌زنند، پس عمداً فقط به همسایه‌های
    همان روز نگاه می‌کند و از پیمایش کل بازه پرهیز دارد.
    """
    neighbours = [
        placement for placement in state.placements_on(date)
        if placement.item.item_id != exclude_item_id
    ]
    total = 0.0
    total += weights.heavy_adjacency * _heavy_adjacency_penalty(item, slot, neighbours)
    total += weights.same_subject_streak * _same_subject_penalty(item, slot, neighbours)
    total += weights.time_of_day * _time_of_day_penalty(item, slot, profile)
    total += weights.fragmentation * _fragmentation_penalty(state, item, date, slot, exclude_item_id)
    total += weights.day_imbalance * _day_load_penalty(state, date, slot.duration_minutes)
    total += weights.deadline * _deadline_penalty(item, date)
    if existing is not None:
        total += weights.displacement * _displacement_penalty(existing, date, slot)
    return total


# ---------- هزینه‌ی کل چیدمان ----------

def schedule_cost(
    state: ScheduleState,
    *,
    unplaced: Sequence[ScheduleItem] = (),
    weights: CostWeights = DEFAULT_WEIGHTS,
    profile: EfficiencyProfile | None = None,
) -> float:
    """هزینه‌ی کل — مبنای پذیرش یا رد یک حرکت در جست‌وجوی محلی."""
    total = 0.0
    for item in unplaced:
        total += weights.unmet_demand * _unmet_weight(item)

    for date in state.days:
        neighbours = state.placements_on(date)
        for index, placement in enumerate(neighbours):
            others = neighbours[:index] + neighbours[index + 1:]
            item, slot = placement.item, placement.slot
            total += weights.heavy_adjacency * _heavy_adjacency_penalty(item, slot, others)
            total += weights.same_subject_streak * _same_subject_penalty(item, slot, others)
            total += weights.time_of_day * _time_of_day_penalty(item, slot, profile)
            total += weights.deadline * _deadline_penalty(item, date)
            if placement.has_moved:
                total += weights.displacement * _displacement_penalty(
                    placement, placement.date, placement.slot,
                )
        total += weights.fragmentation * _day_fragmentation(state, date)

    total += weights.day_imbalance * _imbalance(state)
    return total


# ---------- جمله‌های هزینه ----------

def _unmet_weight(item: ScheduleItem) -> float:
    """C1 — مجذور اولویت، تا یک آیتم P=5 هرگز به نفع چند آیتم P=1 قربانی نشود."""
    return (item.priority ** 2) * (item.duration_minutes / 60.0)


def _heavy_adjacency_penalty(
    item: ScheduleItem, slot: TimeRange, neighbours: Sequence[Placement],
) -> float:
    """C2 — دو بلوک سنگین تحلیلی که استراحت کافی بینشان نیست.

    جریمه نسبی است نه صفر-و-یک: هرچه فاصله به استراحت مطلوب نزدیک‌تر باشد، هزینه
    کمتر است، تا الگوریتم در روز شلوغ «کمترین بدی» را انتخاب کند نه اینکه گیر کند.
    """
    if not item.is_heavy:
        return 0.0
    penalty = 0.0
    for other in neighbours:
        if not other.item.is_heavy:
            continue
        gap = _gap_between(other.slot, slot)
        if gap is None:
            continue
        preferred = other.item.shape.break_minutes + HEAVY_ADJACENCY_EXTRA_BREAK
        if gap < preferred:
            penalty += (preferred - gap) / preferred
    return penalty


def _same_subject_penalty(
    item: ScheduleItem, slot: TimeRange, neighbours: Sequence[Placement],
) -> float:
    """C3 — همان درس بلافاصله قبل یا بعد؛ تنوع، ماندگاری یادگیری را بالا می‌برد."""
    penalty = 0.0
    for other in neighbours:
        if other.item.subject != item.subject:
            continue
        gap = _gap_between(other.slot, slot)
        if gap is not None and gap <= other.item.shape.break_minutes:
            penalty += 1.0
    return penalty


def _time_of_day_penalty(
    item: ScheduleItem, slot: TimeRange, profile: EfficiencyProfile | None,
) -> float:
    """C5 — تناسب ساعت با جنس کار.

    هر کاری در ساعت کم‌هوشیاری گران است، ولی شدتش به بار شناختی بستگی دارد. تنها
    استثنا کار سبکِ حفظی است: آن یکی در ساعت طلایی *گران* می‌شود، چون آن ساعت را
    از کار سنگین می‌گیرد (هزینه‌ی فرصت).
    """
    hour = slot.start_minutes // 60
    fit = alertness_at(slot.start_minutes)
    if profile is not None and profile.hour_scores:
        # نیم‌رخ شخصی دو برابر منحنی عمومی وزن دارد، ولی جایگزینش نمی‌شود:
        # چند بازخورد پراکنده نباید کل منطق ساعت‌بندی را وارونه کند.
        fit = (fit + 2.0 * profile.score_for_hour(hour)) / 3.0

    if item.is_heavy:
        return 1.0 - fit
    if item.cognitive_load <= 1:
        return max(0.0, fit - 0.6) * 0.5
    return (1.0 - fit) * 0.5


def _fragmentation_penalty(
    state: ScheduleState,
    item: ScheduleItem,
    date: JalaliDate,
    slot: TimeRange,
    exclude_item_id: str,
) -> float:
    """C7 — شکاف‌های بی‌مصرفی که این جای‌گذاری به‌جا می‌گذارد (بر حسب ربع ساعت)."""
    leftovers = 0
    for gap in state.gaps(date, min_duration=1, exclude_item_id=exclude_item_id):
        if not gap.contains(slot):
            continue
        before = slot.start_minutes - gap.start_minutes
        after = gap.end_minutes - slot.end_minutes - item.shape.break_minutes
        for remainder in (before, after):
            if 0 < remainder < USABLE_GAP_MINUTES:
                leftovers += remainder
    return leftovers / 15.0


def _day_load_penalty(state: ScheduleState, date: JalaliDate, minutes: int) -> float:
    """C4 (نسخه‌ی افزایشی) — روزی که از قبل سنگین است، گران‌تر می‌شود."""
    return (state.day_load_minutes(date) + minutes) / 60.0


def _deadline_penalty(item: ScheduleItem, date: JalaliDate) -> float:
    """C8 — هرچه به ددلاین نزدیک‌تر، بهتر است زودتر انجام شده باشد."""
    if item.latest_day is None:
        return 0.0
    remaining = date.days_until(item.latest_day)
    if remaining < 0:
        return float(-remaining) + 1.0
    return 0.0


def _displacement_penalty(
    existing: Placement, date: JalaliDate, slot: TimeRange,
) -> float:
    """C6 — جابه‌جا کردن بلوکی که دانش‌آموز قبلاً روی تقویمش دیده بود.

    هرچه شناوری کمتر، جابه‌جایی گران‌تر. شناوری صفر اصلاً به اینجا نمی‌رسد چون در
    مرحله‌ی انتخاب قربانی کنار گذاشته می‌شود.
    """
    if existing.origin_date == date and existing.origin_slot == slot:
        return 0.0
    resistance = 1.0 - (existing.item.movability / 4.0)
    if existing.origin_date != date:
        return 1.0 + resistance
    return 0.5 + resistance


def _day_fragmentation(state: ScheduleState, date: JalaliDate) -> float:
    leftovers = sum(
        gap.duration_minutes
        for gap in state.gaps(date, min_duration=1)
        if gap.duration_minutes < USABLE_GAP_MINUTES
    )
    return leftovers / 15.0


def _imbalance(state: ScheduleState) -> float:
    """C4 — انحراف از بار روزانه‌ی یکنواخت (میانگین قدرمطلق انحراف)."""
    loads = [state.day_load_minutes(day) for day in state.days]
    if len(loads) < 2:
        return 0.0
    mean = sum(loads) / len(loads)
    return sum(abs(load - mean) for load in loads) / len(loads) / 60.0


def _gap_between(first: TimeRange, second: TimeRange) -> int | None:
    """فاصله‌ی دو بازه‌ی متوالی؛ ``None`` اگر هم‌پوشانی داشته باشند."""
    if first.end_minutes <= second.start_minutes:
        return second.start_minutes - first.end_minutes
    if second.end_minutes <= first.start_minutes:
        return first.start_minutes - second.end_minutes
    return None


def hour_scores_are_informative(profile: EfficiencyProfile | None) -> bool:
    return bool(profile is not None and profile.hour_scores)


__all__ = [
    'CostWeights',
    'DEFAULT_WEIGHTS',
    'alertness_at',
    'placement_cost',
    'schedule_cost',
]
