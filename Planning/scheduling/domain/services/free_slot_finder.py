"""یافتن فضای خالی روی یک محور زمانی یک‌روزه — توابع خالص و بدون وابستگی.

ورودی همه‌ی توابع «بازه‌های اشغال» است و خروجی «بازه‌های آزاد»؛ هیچ خبری از
رویداد، دانش‌آموز یا دیتابیس اینجا نیست. همین خلوص باعث می‌شود موتور برنامه‌ریزی
گروهی در فاز بعد بتواند بدون هیچ I/O، هزاران چیدمان را در حافظه بسنجد.

قرارداد بازه نیم‌باز ``[start, end)`` است؛ پس ۸:۰۰–۹:۰۰ و ۹:۰۰–۱۰:۰۰ پشت سر هم
می‌نشینند و «فضای خالی صفر دقیقه» بین‌شان تولید نمی‌شود.
"""
from __future__ import annotations

from typing import Iterable, Sequence

from ..value_objects.time_range import TimeRange


def merge_ranges(ranges: Iterable[TimeRange]) -> list[TimeRange]:
    """بازه‌های متداخل/چسبیده را در کم‌ترین تعداد بازه‌ی مجزا ادغام می‌کند."""
    ordered = sorted(ranges, key=lambda r: (r.start_minutes, r.end_minutes))
    merged: list[TimeRange] = []
    for current in ordered:
        if merged and current.start_minutes <= merged[-1].end_minutes:
            last = merged[-1]
            if current.end_minutes > last.end_minutes:
                merged[-1] = TimeRange(last.start_minutes, current.end_minutes)
            continue
        merged.append(current)
    return merged


def free_gaps(
    window: TimeRange, busy: Sequence[TimeRange], *, min_duration: int = 1,
) -> list[TimeRange]:
    """شکاف‌های خالی داخل ``window``، به ترتیب زمانی.

    بازه‌های اشغالِ بیرون از پنجره نادیده گرفته می‌شوند (مثلاً کلاس ۵ صبح وقتی
    پنجره‌ی بیداری از ۶ شروع می‌شود) چون در محاسبه‌ی ظرفیتِ همان پنجره نقشی ندارند.
    """
    gaps: list[TimeRange] = []
    cursor = window.start_minutes
    for block in merge_ranges(busy):
        if block.end_minutes <= window.start_minutes or block.start_minutes >= window.end_minutes:
            continue
        if block.start_minutes - cursor >= max(min_duration, 1):
            gaps.append(TimeRange(cursor, block.start_minutes))
        cursor = max(cursor, block.end_minutes)
    if window.end_minutes - cursor >= max(min_duration, 1):
        gaps.append(TimeRange(cursor, window.end_minutes))
    return gaps


def first_fit(
    window: TimeRange,
    busy: Sequence[TimeRange],
    duration_minutes: int,
    *,
    not_before: int | None = None,
) -> TimeRange | None:
    """نخستین جایی که یک بلوک با طول داده‌شده جا می‌شود؛ در نبودِ جا ``None``.

    ``not_before`` نقطه‌ی شروع جست‌وجوست (زمانی که مشاور بلوک را روی ساعت خاصی رها
    کرده): اگر همان‌جا آزاد باشد دقیقاً همان‌جا برمی‌گردد، وگرنه نزدیک‌ترین فضای
    خالیِ بعد از آن. جست‌وجوی «قبل از آن نقطه» عمداً اینجا انجام نمی‌شود؛ آن تصمیمِ
    سطح بالاتر است (``DayAgenda``) تا این تابع یک قاعده‌ی ساده و قابل پیش‌بینی بماند.
    """
    if duration_minutes <= 0:
        return None
    for gap in free_gaps(window, busy, min_duration=duration_minutes):
        start = gap.start_minutes if not_before is None else max(gap.start_minutes, not_before)
        if start + duration_minutes <= gap.end_minutes:
            return TimeRange.of_duration(start, duration_minutes)
    return None


def total_minutes(ranges: Sequence[TimeRange]) -> int:
    return sum(item.duration_minutes for item in ranges)
