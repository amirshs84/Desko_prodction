"""DTO های خروجی use-case های رویداد ثابت.

خروجی سرویس‌ها موجودیت خام دامنه نیست تا لایه‌ی REST نتواند به قواعد داخلی تکیه
کند و قرارداد API مستقل از شکل دامنه تغییر کند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ...domain.entities.calendar_event import CalendarEvent
from ...domain.value_objects.jalali_date import JalaliDate


@dataclass(frozen=True)
class FixedEventGroupDTO:
    """یک گروه رویداد ثابت (مثلاً «ریاضی، شنبه‌ها ۸ تا ۹:۳۰») در سطح کلاس."""

    group_id: str
    title: str
    description: str
    color: str
    start_minutes: int
    end_minutes: int
    dates: tuple[JalaliDate, ...]
    student_count: int
    event_count: int

    @classmethod
    def from_events(cls, group_id: str, events: list[CalendarEvent]) -> 'FixedEventGroupDTO':
        sample = events[0]
        return cls(
            group_id=group_id,
            title=sample.title,
            description=sample.description,
            color=sample.color,
            start_minutes=sample.slot.start_minutes,
            end_minutes=sample.slot.end_minutes,
            dates=tuple(sorted({event.date for event in events}, key=lambda day: day.to_gregorian())),
            student_count=len({event.owner_id for event in events}),
            event_count=len(events),
        )


@dataclass(frozen=True)
class FixedEventCreationDTO:
    group_id: str
    created_count: int
    skipped_count: int
    student_count: int
    dates: tuple[JalaliDate, ...]
