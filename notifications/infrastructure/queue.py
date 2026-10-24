"""پیاده‌سازی‌های ``NotificationQueue``: celery (prod) و inline (dev/test)."""
from __future__ import annotations

import logging
import uuid
from collections.abc import Callable
from datetime import datetime

from django.utils import timezone

from ..application.ports import NotificationQueue
from ..domain.enums import Priority
from ..domain.errors import PushProviderError
from ..domain.policies import policy_for

logger = logging.getLogger(__name__)

TASK_BY_QUEUE = {
    "notif_critical": "notifications.dispatch_critical",
    "notif_default": "notifications.dispatch_default",
    "notif_bulk": "notifications.dispatch_bulk",
}


class CeleryNotificationQueue(NotificationQueue):
    def enqueue(self, notification_id: uuid.UUID, priority: Priority, eta: datetime | None = None) -> None:
        from desko_backend.celery import app

        queue = policy_for(priority).queue
        # ETA های دور در Redis broker (visibility timeout) قابل اتکا نیستند؛
        # بیش از یک ساعت را به beat (release_deferred) می‌سپاریم.
        if eta and (eta - timezone.now()).total_seconds() > 3600:
            return
        app.send_task(
            TASK_BY_QUEUE[queue],
            args=[str(notification_id)],
            queue=queue,
            eta=eta if eta and eta > timezone.now() else None,
        )


class InlineNotificationQueue(NotificationQueue):
    """ارسال هم‌زمان در همان فرایند؛ زمان‌بندی‌های آینده را beat آزاد می‌کند."""

    def __init__(self, dispatcher: Callable[[], Callable[..., object]]) -> None:
        self._dispatcher = dispatcher

    def enqueue(self, notification_id: uuid.UUID, priority: Priority, eta: datetime | None = None) -> None:
        if eta and eta > timezone.now():
            return
        try:
            self._dispatcher()(notification_id, final_attempt=True)
        except PushProviderError as exc:
            logger.warning("inline dispatch failed for %s: %s", notification_id, exc)
