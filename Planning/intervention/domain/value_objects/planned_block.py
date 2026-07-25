"""PlannedBlock — یک بلوک مطالعاتیِ پیشنهادی که هنوز روی تقویم نیست.

عمداً با ``CalendarEvent`` یکی نشده: بلوک پیشنهادی نه شناسه‌ی رویداد دارد، نه نسخه،
نه مالک؛ فقط «چه درسی، چه روزی، چه ساعتی». تبدیل آن به رویداد فقط در لحظه‌ی انتشار
و در لایه‌ی application رخ می‌دهد.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ....shared.domain.value_object import ValueObject

DEFAULT_BLOCK_COLOR = '#10b981'


@dataclass(frozen=True)
class PlannedBlock(ValueObject):
    date: JalaliDate
    slot: TimeRange
    subject: str
    color: str = DEFAULT_BLOCK_COLOR

    @property
    def minutes(self) -> int:
        return self.slot.duration_minutes

    def __str__(self) -> str:
        return f'{self.subject} {self.date} {self.slot}'
