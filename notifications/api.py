"""Facade عمومی ماژول نوتیفیکیشن — تنها چیزی که ماژول‌های دیگر import می‌کنند.

مثال:
    from notifications.api import Notifier, Priority

    Notifier.notify(
        recipients=[student_id],
        category="direct_message",
        template="consultant_direct_message",
        context={"sender_name": "خانم احمدی", "preview": text[:120]},
        deeplink="/messages",
        collapse_key=f"dm:{thread_id}",
    )

    Notifier.schedule_local(
        user_id=student_id,
        source_key=f"planning_block:{block.id}",
        category="study_reminder",
        fire_at=block.start - timedelta(minutes=5),
        template="study_block_reminder",
        context={"subject": "ریاضی", "start_time": "۱۶:۰۰"},
    )
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any, Iterable

from .application.commands import NotifyCommand, NotifyResult, ScheduleLocalCommand
from .domain.enums import ChannelType, Priority
from .domain.errors import NotificationError

logger = logging.getLogger(__name__)

__all__ = ["Notifier", "Priority", "ChannelType", "NotificationError"]


def _ids(recipients: Iterable[Any]) -> tuple[int, ...]:
    return tuple(int(getattr(r, "id", r)) for r in recipients)


class Notifier:
    @staticmethod
    def notify(
        *,
        recipients: Iterable[Any],
        category: str,
        template: str | None = None,
        context: dict[str, Any] | None = None,
        title: str | None = None,
        body: str | None = None,
        content: dict[str, Any] | None = None,
        priority: Priority | str | None = None,
        channels: Iterable[ChannelType | str] | None = None,
        deeplink: str | None = None,
        collapse_key: str | None = None,
        idempotency_key: str | None = None,
        scheduled_at: datetime | None = None,
        expires_at: datetime | None = None,
        metadata: dict[str, Any] | None = None,
        locale: str = "fa",
    ) -> NotifyResult:
        from .container import get_container

        cmd = NotifyCommand(
            recipient_ids=_ids(recipients),
            category=category,
            template_key=template,
            context=dict(context or {}),
            title=title,
            body=body,
            content_options=dict(content or {}),
            priority=Priority(priority) if priority else None,
            channels=frozenset(ChannelType(c) for c in channels) if channels else None,
            deeplink=deeplink,
            collapse_key=collapse_key,
            idempotency_key=idempotency_key,
            scheduled_at=scheduled_at,
            expires_at=expires_at,
            locale=locale,
            metadata=dict(metadata or {}),
        )
        return get_container().notify_service.notify(cmd)

    @staticmethod
    def notify_safely(**kwargs: Any) -> NotifyResult | None:
        """برای صدا زدن از جریان‌های اصلی کسب‌وکار: خطای نوتیف هرگز آن جریان را نمی‌شکند."""
        try:
            return Notifier.notify(**kwargs)
        except Exception:  # noqa: BLE001
            logger.exception("notification failed: category=%s", kwargs.get("category"))
            return None

    @staticmethod
    def schedule_local(
        *,
        user_id: int,
        source_key: str,
        category: str,
        fire_at: datetime,
        template: str | None = None,
        context: dict[str, Any] | None = None,
        title: str | None = None,
        body: str | None = None,
        content: dict[str, Any] | None = None,
        deeplink: str | None = None,
        priority: Priority | str | None = None,
    ) -> uuid.UUID:
        from .container import get_container

        reminder = get_container().local_schedule_service.schedule(
            ScheduleLocalCommand(
                user_id=int(user_id),
                source_key=source_key,
                category=category,
                fire_at=fire_at,
                template_key=template,
                context=dict(context or {}),
                title=title,
                body=body,
                content_options=dict(content or {}),
                deeplink=deeplink,
                priority=Priority(priority) if priority else None,
            )
        )
        return reminder.id

    @staticmethod
    def cancel_local(*, user_id: int, source_key: str) -> bool:
        from .container import get_container

        return get_container().local_schedule_service.cancel(int(user_id), source_key)

    @staticmethod
    def cancel_local_prefix(
        *,
        user_id: int,
        prefix: str,
        keep: Iterable[str] = (),
    ) -> int:
        """یادآورهای فعال با این پیشوند را که در ``keep`` نیستند لغو می‌کند."""
        from .container import get_container

        return get_container().local_schedule_service.cancel_prefix(
            int(user_id), prefix, keep
        )
