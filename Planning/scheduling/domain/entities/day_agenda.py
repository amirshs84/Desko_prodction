"""DayAgenda — نمای درون‌حافظه‌ای یک روز از تقویم یک دانش‌آموز.

مسئول پاسخ به سه پرسش تکراری تقویم مشاور:
  ۱. اگر بلوک را اینجا بگذارم، با چه چیزی تداخل دارد؟
  ۲. امروز کجاها خالی است؟
  ۳. نزدیک‌ترین جای خالی برای بلوکی به این طول کجاست؟

نکته‌ی مهم: رویدادهای «تمام‌روز» ظرفیت زمانی مصرف نمی‌کنند. آن‌ها در UI هم یک نوار
جدا بالای شبکه‌اند (یادداشتی مثل «روز آزمون») و اگر جزو اشغال حساب می‌شدند، هر روزی
که یک یادداشت تمام‌روز داشت برای همیشه پر به نظر می‌رسید.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

from ....shared.domain.errors import DailyCapacityFullError
from ..services.awake_window_policy import AwakeWindowPolicy
from ..services.free_slot_finder import first_fit, free_gaps, merge_ranges, total_minutes
from ..value_objects.jalali_date import JalaliDate
from ..value_objects.time_range import TimeRange
from .calendar_event import CalendarEvent


@dataclass(frozen=True)
class DayAgenda:
    owner_id: int
    date: JalaliDate
    events: tuple[CalendarEvent, ...]
    policy: AwakeWindowPolicy

    @classmethod
    def build(
        cls,
        owner_id: int,
        date: JalaliDate,
        events: Iterable[CalendarEvent],
        *,
        policy: AwakeWindowPolicy | None = None,
    ) -> 'DayAgenda':
        return cls(
            owner_id=owner_id,
            date=date,
            events=tuple(event for event in events if event.date == date),
            policy=policy or AwakeWindowPolicy.default(),
        )

    # ---------- اشغال و خالی ----------

    def timed_events(self, *, exclude_client_id: str | None = None) -> list[CalendarEvent]:
        return [
            event for event in self.events
            if not event.all_day and event.client_id != exclude_client_id
        ]

    def busy_ranges(self, *, exclude_client_id: str | None = None) -> list[TimeRange]:
        return merge_ranges(
            event.slot for event in self.timed_events(exclude_client_id=exclude_client_id)
        )

    def free_slots(
        self, *, min_duration: int = 1, exclude_client_id: str | None = None,
    ) -> list[TimeRange]:
        return free_gaps(
            self.policy.window,
            self.busy_ranges(exclude_client_id=exclude_client_id),
            min_duration=min_duration,
        )

    def free_minutes(self, *, exclude_client_id: str | None = None) -> int:
        return total_minutes(self.free_slots(exclude_client_id=exclude_client_id))

    def largest_free_minutes(self, *, exclude_client_id: str | None = None) -> int:
        slots = self.free_slots(exclude_client_id=exclude_client_id)
        return max((slot.duration_minutes for slot in slots), default=0)

    def busy_minutes_in_window(self) -> int:
        return self.policy.capacity_minutes - self.free_minutes()

    # ---------- تداخل ----------

    def conflicts(
        self, slot: TimeRange, *, exclude_client_id: str | None = None,
    ) -> list[CalendarEvent]:
        return [
            event for event in self.timed_events(exclude_client_id=exclude_client_id)
            if event.slot.overlaps(slot)
        ]

    def is_free(self, slot: TimeRange, *, exclude_client_id: str | None = None) -> bool:
        return not self.conflicts(slot, exclude_client_id=exclude_client_id)

    # ---------- جای‌گذاری ----------

    def find_slot(
        self,
        duration_minutes: int,
        *,
        preferred_start: int | None = None,
        exclude_client_id: str | None = None,
    ) -> TimeRange:
        """جای پیشنهادی برای بلوکی به این طول (قاعده‌ی «snap به اولین فضای خالی»).

        ترتیب جست‌وجو: اول از نقطه‌ی درخواستی به جلو (نزدیک‌ترین جا به جایی که کاربر
        بلوک را رها کرده)، و اگر تا انتهای پنجره جایی نبود، اولین فضای خالی از ابتدای
        پنجره. اگر هیچ‌کدام نشد یعنی روز واقعاً پر است.
        """
        busy = self.busy_ranges(exclude_client_id=exclude_client_id)
        window = self.policy.window

        candidate = None
        if preferred_start is not None:
            candidate = first_fit(window, busy, duration_minutes, not_before=preferred_start)
        if candidate is None:
            candidate = first_fit(window, busy, duration_minutes)
        if candidate is None:
            raise DailyCapacityFullError(
                meta=self.capacity_snapshot(
                    duration_minutes, exclude_client_id=exclude_client_id,
                ),
            )
        return candidate

    def capacity_snapshot(
        self, requested_minutes: int, *, exclude_client_id: str | None = None,
    ) -> dict:
        """گزارش کوتاه وضعیت روز — برای پیام خطای قابل فهم در UI."""
        slots = self.free_slots(exclude_client_id=exclude_client_id)
        return {
            'date': str(self.date),
            'requested_minutes': requested_minutes,
            'free_minutes': total_minutes(slots),
            'largest_free_minutes': max((slot.duration_minutes for slot in slots), default=0),
            'window_start_minutes': self.policy.window.start_minutes,
            'window_end_minutes': self.policy.window.end_minutes,
        }


def group_by_date(events: Sequence[CalendarEvent]) -> dict[JalaliDate, list[CalendarEvent]]:
    """کمکی برای ساخت چند DayAgenda از یک کوئری بازه‌ای (استفاده در فاز برنامه‌ریزی گروهی)."""
    grouped: dict[JalaliDate, list[CalendarEvent]] = {}
    for event in events:
        grouped.setdefault(event.date, []).append(event)
    return grouped
