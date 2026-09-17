"""تولید جایگاه‌های ممکن برای یک آیتم.

موتور قدیمی همیشه «اولین شکاف» را برمی‌داشت و به همین دلیل هیچ جای تصمیم‌گیری
نداشت. اینجا به‌جای یک جایگاه، مجموعه‌ای از جایگاه‌های *معتبر* تولید می‌شود تا تابع
هزینه بتواند بینشان انتخاب کند.

پله‌ی ۱۵ دقیقه‌ای عمدی است: ساعت‌های گرد برای انسان خواناترند و فضای جست‌وجو را هم
۱۵ برابر کوچک‌تر می‌کند. ابتدای خود شکاف هم همیشه کاندید است تا چیدمان فشرده (بدون
حفره‌ی بی‌مصرف) ممکن بماند حتی اگر روی پله نیفتد.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .....scheduling.domain.value_objects.jalali_date import JalaliDate
from .....scheduling.domain.value_objects.time_range import TimeRange
from ...value_objects.schedule_item import ScheduleItem
from .state import ScheduleState

SNAP_MINUTES = 15
#: سقف کاندید به‌ازای هر روز. بدون این سقف، یک روز کاملاً خالی ۶۴ کاندید می‌سازد و
#: هزینه‌ی جست‌وجو برای بچ ۲۰۰ نفره از کنترل خارج می‌شود.
MAX_CANDIDATES_PER_DAY = 10


@dataclass(frozen=True)
class Candidate:
    date: JalaliDate
    slot: TimeRange

    @property
    def start_minutes(self) -> int:
        return self.slot.start_minutes


def generate_candidates(
    state: ScheduleState,
    item: ScheduleItem,
    *,
    days: Sequence[JalaliDate] | None = None,
    exclude_item_id: str = '',
    max_per_day: int = MAX_CANDIDATES_PER_DAY,
) -> list[Candidate]:
    """همه‌ی جایگاه‌های معتبر این آیتم، به ترتیب (روز، ساعت)."""
    duration = item.duration_minutes
    if duration <= 0:
        return []

    candidates: list[Candidate] = []
    for date in (days if days is not None else state.days):
        if not item.allows_day(date):
            continue
        starts = _starts_for_day(state, item, date, duration, exclude_item_id)
        if len(starts) > max_per_day:
            starts = _subsample(starts, max_per_day)
        candidates.extend(
            Candidate(date=date, slot=TimeRange.of_duration(start, duration))
            for start in starts
        )
    return candidates


def _starts_for_day(
    state: ScheduleState,
    item: ScheduleItem,
    date: JalaliDate,
    duration: int,
    exclude_item_id: str,
) -> list[int]:
    gaps = state.gaps(date, min_duration=duration, exclude_item_id=exclude_item_id)
    seen: set[int] = set()
    starts: list[int] = []
    for gap in gaps:
        latest = gap.end_minutes - duration
        for start in _snap_points(gap.start_minutes, latest):
            if start in seen:
                continue
            seen.add(start)
            if state.fits(
                item, date, TimeRange.of_duration(start, duration),
                exclude_item_id=exclude_item_id,
            ):
                starts.append(start)
    starts.sort()
    return starts


def _snap_points(earliest: int, latest: int) -> list[int]:
    """ابتدای شکاف، به‌علاوه‌ی همه‌ی مضارب ۱۵ دقیقه تا آخرین شروع ممکن."""
    if latest < earliest:
        return []
    points = [earliest]
    first_aligned = ((earliest + SNAP_MINUTES - 1) // SNAP_MINUTES) * SNAP_MINUTES
    points.extend(range(first_aligned, latest + 1, SNAP_MINUTES))
    return points


def _subsample(values: list[int], limit: int) -> list[int]:
    """نمونه‌برداری یکنواخت و دترمینیستیک؛ همیشه اولین و آخرین را نگه می‌دارد."""
    if limit <= 1 or len(values) <= limit:
        return values[:limit]
    last = len(values) - 1
    picked = {round(index * last / (limit - 1)) for index in range(limit)}
    return [values[index] for index in sorted(picked)]
