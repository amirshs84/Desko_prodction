"""Command های ویرایش تقویم یک دانش‌آموز.

فیلدهای اختیاری (``None``) یعنی «تغییر نده». دلیل اینکه ``start_minutes`` و
``end_minutes`` جدا از ``TimeRange`` گرفته می‌شوند این است که کلاینت می‌تواند فقط
یکی از دو سر بازه را بفرستد؛ ساخت Value Object بازه به سرویس سپرده می‌شود، چون
تنها آنجاست که مقدار فعلی رویداد هم در دست است.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.application.cqrs import Command
from ....shared.domain.errors import ValidationError
from ...domain.entities.calendar_event import DEFAULT_EVENT_COLOR
from ...domain.value_objects.jalali_date import JalaliDate
from ...domain.value_objects.time_range import TimeRange

MAX_EVENTS_PER_CREATE = 500


@dataclass(frozen=True)
class EventDraft:
    """توصیف یک رویداد تازه، پیش از تبدیل به موجودیت دامنه."""

    client_id: str
    date: JalaliDate
    slot: TimeRange
    title: str
    description: str = ''
    color: str = DEFAULT_EVENT_COLOR
    all_day: bool = False
    group_id: str = ''


@dataclass(frozen=True)
class CreateEventsCommand(Command):
    owner_id: int
    drafts: tuple[EventDraft, ...]

    def __post_init__(self) -> None:
        if not self.drafts:
            raise ValidationError('هیچ رویدادی برای ایجاد ارسال نشده است.')
        if len(self.drafts) > MAX_EVENTS_PER_CREATE:
            raise ValidationError(
                f'در هر درخواست حداکثر {MAX_EVENTS_PER_CREATE} رویداد می‌توان ساخت.',
                meta={'count': len(self.drafts)},
            )


@dataclass(frozen=True)
class UpdateEventCommand(Command):
    owner_id: int
    client_id: str
    jy: int | None = None
    jm: int | None = None
    jd: int | None = None
    start_minutes: int | None = None
    end_minutes: int | None = None
    title: str | None = None
    description: str | None = None
    color: str | None = None
    all_day: bool | None = None

    @property
    def touches_date(self) -> bool:
        return any(part is not None for part in (self.jy, self.jm, self.jd))


@dataclass(frozen=True)
class UpdateGroupCommand(Command):
    """ویرایش فیلدهای مشترک همه‌ی رویدادهای یک گروه (تاریخ‌ها دست‌نخورده می‌مانند)."""

    owner_id: int
    group_id: str
    start_minutes: int | None = None
    end_minutes: int | None = None
    title: str | None = None
    description: str | None = None
    color: str | None = None
    all_day: bool | None = None

    def __post_init__(self) -> None:
        if not self.group_id:
            raise ValidationError('شناسه‌ی گروه لازم است.')
