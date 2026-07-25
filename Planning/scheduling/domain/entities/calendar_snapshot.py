"""CalendarSnapshot — عکس لحظه‌ای از تقویم یک دانش‌آموز برای بازگردانی.

سند: «حرکات تکی (درگ‌ودراپ) نسخه ذخیره نمی‌شوند؛ پس از هر بار انتشار، یک Snapshot
از کل تقویم گرفته می‌شود و فقط ۱۰ نسخه‌ی آخر نگه‌داری می‌شود».

قاعده‌ی مهم بازگردانی: فقط رویدادهای قابل تغییر برمی‌گردند. رویدادهای ثابت مدرسه
نه در حذف و نه در بازنویسی دست‌کاری نمی‌شوند — اگر مدیر بعد از گرفتن اسنپ‌شات کلاس
تازه‌ای اضافه کرده باشد، بازگردانیِ برنامه نباید آن را پاک کند.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ..entities.calendar_event import CalendarEvent


class SnapshotReason:
    """چرا این نسخه گرفته شد (برای نمایش در فهرست بازگردانی)."""

    PLAN_PUBLISH = 'plan_publish'
    PROPOSAL_ACCEPT = 'proposal_accept'
    MANUAL = 'manual'
    RESTORE = 'restore'


@dataclass(frozen=True)
class CalendarSnapshot:
    owner_id: int
    reason: str
    events: tuple[CalendarEvent, ...]
    id: int | None = None
    plan_run_id: str = ''
    taken_at: datetime | None = None
    #: در فهرست‌ها، رویدادها بار نمی‌شوند و فقط همین شمارنده از دیتابیس می‌آید.
    event_count: int = -1

    def __post_init__(self) -> None:
        if self.event_count < 0:
            object.__setattr__(self, 'event_count', len(self.events))

    @property
    def restorable_events(self) -> tuple[CalendarEvent, ...]:
        return tuple(event for event in self.events if not event.is_immutable)
