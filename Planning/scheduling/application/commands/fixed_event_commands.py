"""Command های مربوط به رویدادهای ثابت مدرسه (کلاس درسی و فوق‌برنامه‌ی قطعی)."""
from __future__ import annotations

from dataclasses import dataclass, field

from ....shared.application.cqrs import Command
from ....shared.domain.errors import ValidationError
from ...domain.entities.calendar_event import DEFAULT_EVENT_COLOR
from ...domain.value_objects.jalali_date import JalaliDate
from ...domain.value_objects.time_range import TimeRange
from ...domain.value_objects.weekly_recurrence import WeeklyRecurrence

MAX_EVENTS_PER_REQUEST = 5000


@dataclass(frozen=True)
class CreateClassFixedEventsCommand(Command):
    """ساخت یک گروه رویداد ثابت برای همه‌ی دانش‌آموزان یک کلاس.

    یا ``dates`` (فهرست صریح روزها) داده می‌شود یا ``recurrence`` (تکرار هفتگی)،
    نه هر دو.
    """

    class_id: int
    title: str
    slot: TimeRange
    dates: tuple[JalaliDate, ...] = ()
    recurrence: WeeklyRecurrence | None = None
    description: str = ''
    color: str = DEFAULT_EVENT_COLOR

    def __post_init__(self) -> None:
        if bool(self.dates) == bool(self.recurrence):
            raise ValidationError('باید دقیقاً یکی از «روزهای مشخص» یا «تکرار هفتگی» داده شود.')

    def resolve_dates(self) -> list[JalaliDate]:
        days = list(self.recurrence.dates()) if self.recurrence else list(self.dates)
        if not days:
            raise ValidationError('هیچ روزی برای این رویداد تعیین نشده است.')
        return sorted(set(days), key=lambda day: day.to_gregorian())


@dataclass(frozen=True)
class DeleteFixedEventGroupCommand(Command):
    class_id: int
    group_id: str = field(default='')

    def __post_init__(self) -> None:
        if not self.group_id:
            raise ValidationError('شناسه‌ی گروه لازم است.')
