"""همگام‌سازی یادآور بلوک مطالعه با ``Notifier.schedule_local``.

ماژول‌های Planning فقط همین helper را صدا می‌زنند؛ جزئیات نوتیف پشت Facade است.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from ...domain.entities.calendar_event import CalendarEvent

logger = logging.getLogger(__name__)

SOURCE_PREFIX = "planning_block:"
LEAD = timedelta(minutes=5)
_TZ = ZoneInfo("Asia/Tehran")


def source_key_for(event: CalendarEvent) -> str:
    return f"{SOURCE_PREFIX}{event.client_id}"


def is_remindable(event: CalendarEvent) -> bool:
    return not event.all_day and not event.is_immutable


def event_start(event: CalendarEvent) -> datetime:
    day = event.date.to_gregorian()
    return datetime(day.year, day.month, day.day, tzinfo=_TZ) + timedelta(
        minutes=event.slot.start_minutes
    )


def _clock(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def sync_study_reminder(event: CalendarEvent) -> None:
    if not is_remindable(event):
        cancel_study_reminder(event.owner_id, event.client_id)
        return
    try:
        from notifications.api import Notifier

        Notifier.schedule_local(
            user_id=event.owner_id,
            source_key=source_key_for(event),
            category="study_reminder",
            fire_at=event_start(event) - LEAD,
            template="study_block_reminder",
            context={
                "subject": event.title,
                "start_time": _clock(event.slot.start_minutes),
            },
            deeplink="/calendar",
        )
    except Exception:  # noqa: BLE001 — یادآور هرگز جریان تقویم را نمی‌شکند
        logger.exception("study reminder sync failed: %s", event.client_id)


def cancel_study_reminder(user_id: int, client_id: str) -> None:
    try:
        from notifications.api import Notifier

        Notifier.cancel_local(user_id=user_id, source_key=f"{SOURCE_PREFIX}{client_id}")
    except Exception:  # noqa: BLE001
        logger.exception("study reminder cancel failed: %s", client_id)


def sync_study_reminders(events: list[CalendarEvent]) -> None:
    for event in events:
        sync_study_reminder(event)


def reconcile_study_reminders(user_id: int, events: list[CalendarEvent]) -> None:
    """بعد از بازنویسی تقویم (مثلاً restore): یادآورهای کهنه لغو و فعلی‌ها upsert می‌شوند."""
    keep = [source_key_for(event) for event in events if is_remindable(event)]
    try:
        from notifications.api import Notifier

        Notifier.cancel_local_prefix(user_id=user_id, prefix=SOURCE_PREFIX, keep=keep)
    except Exception:  # noqa: BLE001
        logger.exception("study reminder reconcile failed for user %s", user_id)
    sync_study_reminders(events)
