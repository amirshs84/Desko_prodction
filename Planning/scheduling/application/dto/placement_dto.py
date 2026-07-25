"""DTO های نتیجه‌ی جای‌گذاری و گزارش فضای خالی روز."""
from __future__ import annotations

from dataclasses import dataclass

from ...domain.entities.calendar_event import CalendarEvent
from ...domain.value_objects.jalali_date import JalaliDate
from ...domain.value_objects.time_range import TimeRange


@dataclass(frozen=True)
class PlacementResultDTO:
    """رویداد نهایی + اینکه آیا سرور آن را جابه‌جا کرده است.

    ``snapped`` به UI اجازه می‌دهد به‌جای «انگار هیچ اتفاقی نیفتاد»، به مشاور بگوید
    «جای درخواستی پر بود؛ بلوک به نزدیک‌ترین فضای خالی منتقل شد».
    """

    event: CalendarEvent
    requested_start_minutes: int | None
    snapped: bool


@dataclass(frozen=True)
class DayAvailabilityDTO:
    date: JalaliDate
    window: TimeRange
    free_slots: tuple[TimeRange, ...]
    busy_slots: tuple[TimeRange, ...]
    free_minutes: int
    busy_minutes: int
    largest_free_minutes: int
