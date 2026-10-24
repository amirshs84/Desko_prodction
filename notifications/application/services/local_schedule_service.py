"""LocalScheduleService — یادآورهایی که سرور تعریف و دستگاه زمان‌بندی می‌کند.

مزیت: به FCM وابسته نیست (در ایران ناپایدار است) و آفلاین هم سر وقت نمایش داده
می‌شود. کلاینت با ``sync(since)`` فقط تغییرات را می‌گیرد و برنامه‌ی محلی را
reconcile می‌کند.
"""
from __future__ import annotations

import uuid
from collections.abc import Iterable
from datetime import datetime, timedelta
from typing import Any

from ...domain.entities import LocalReminder
from ...domain.enums import ChannelType
from ...domain.errors import InvalidNotification, NotFound
from ...domain.repositories import CategoryRepository, LocalReminderRepository
from ..commands import ScheduleLocalCommand
from ..content_factory import ContentFactory
from ..dto import reminder_to_dict
from ..ports import Clock
from .preference_service import PreferenceService

SYNC_HORIZON = timedelta(days=14)


class LocalScheduleService:
    def __init__(
        self,
        *,
        reminders: LocalReminderRepository,
        categories: CategoryRepository,
        content_factory: ContentFactory,
        preferences: PreferenceService,
        clock: Clock,
    ) -> None:
        self._reminders = reminders
        self._categories = categories
        self._content = content_factory
        self._preferences = preferences
        self._clock = clock

    def schedule(self, cmd: ScheduleLocalCommand) -> LocalReminder:
        category = self._categories.get(cmd.category)
        if category is None:
            raise NotFound(f"دسته‌ی {cmd.category!r} یافت نشد.")
        if not cmd.source_key or len(cmd.source_key) > 128:
            raise InvalidNotification("source_key نامعتبر است.")
        built = self._content.build(
            template_key=cmd.template_key,
            locale=cmd.locale,
            context=cmd.context,
            title=cmd.title,
            body=cmd.body,
            content_options=cmd.content_options,
            deeplink=cmd.deeplink,
        )
        now = self._clock.now()
        return self._reminders.upsert(
            LocalReminder(
                id=uuid.uuid4(),
                user_id=cmd.user_id,
                source_key=cmd.source_key,
                category_key=category.key,
                fire_at=cmd.fire_at,
                content=built.content,
                updated_at=now,
                deeplink=built.deeplink,
                priority=cmd.priority or category.default_priority,
                cancelled=cmd.fire_at <= now,
            )
        )

    def cancel(self, user_id: int, source_key: str) -> bool:
        return self._reminders.cancel(user_id, source_key, self._clock.now())

    def cancel_prefix(self, user_id: int, prefix: str, keep: Iterable[str] = ()) -> int:
        now = self._clock.now()
        keep_keys = set(keep)
        cancelled = 0
        for reminder in self._reminders.list_active_by_prefix(user_id, prefix, now):
            if reminder.source_key in keep_keys:
                continue
            if self._reminders.cancel(user_id, reminder.source_key, now):
                cancelled += 1
        return cancelled

    def sync(self, user_id: int, since: datetime | None) -> dict[str, Any]:
        now = self._clock.now()
        pref = self._preferences.get(user_id)
        items = self._reminders.changed_since(user_id, since, now + SYNC_HORIZON)
        return {
            "items": [
                reminder_to_dict(r, enabled=pref.allows(r.category_key, ChannelType.PUSH))
                for r in items
                if since is not None or not r.is_stale(now)
            ],
            # cursor بعدی؛ کلاینت در درخواست بعد همین را به‌عنوان since می‌فرستد
            "server_time": now.isoformat(),
        }
