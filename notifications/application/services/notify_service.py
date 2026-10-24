"""NotifyService — نقطه‌ی ورود ارسال: ساخت، ذخیره و صف‌کردن نوتیف‌ها."""
from __future__ import annotations

from collections.abc import Callable

from ...domain.entities import InteractionEvent, Notification
from ...domain.errors import InvalidNotification, NotFound
from ...domain.repositories import (
    CategoryRepository,
    InteractionEventRepository,
    NotificationRepository,
)
from ..commands import NotifyCommand, NotifyResult
from ..content_factory import ContentFactory
from ..ports import Clock, NotificationQueue, UnitOfWork
from .events import lifecycle_to_interactions

MAX_RECIPIENTS = 5000


class NotifyService:
    def __init__(
        self,
        *,
        notifications: NotificationRepository,
        categories: CategoryRepository,
        events: InteractionEventRepository,
        content_factory: ContentFactory,
        queue: NotificationQueue,
        clock: Clock,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._notifications = notifications
        self._categories = categories
        self._events = events
        self._content = content_factory
        self._queue = queue
        self._clock = clock
        self._uow = uow_factory

    def notify(self, cmd: NotifyCommand) -> NotifyResult:
        recipients = list(dict.fromkeys(cmd.recipient_ids))
        if not recipients:
            raise InvalidNotification("حداقل یک گیرنده لازم است.")
        if len(recipients) > MAX_RECIPIENTS:
            raise InvalidNotification(f"حداکثر {MAX_RECIPIENTS} گیرنده در هر درخواست.")
        category = self._categories.get(cmd.category)
        if category is None:
            raise NotFound(f"دسته‌ی {cmd.category!r} یافت نشد.")

        built = self._content.build(
            template_key=cmd.template_key,
            locale=cmd.locale,
            context=cmd.context,
            title=cmd.title,
            body=cmd.body,
            content_options=cmd.content_options,
            deeplink=cmd.deeplink,
        )
        template = built.template
        priority = cmd.priority or (template.priority if template else None) or category.default_priority
        channels = cmd.channels or (template.channels if template else None) or category.default_channels

        now = self._clock.now()
        created: list[Notification] = []
        duplicates = []
        with self._uow() as uow:
            for recipient_id in recipients:
                if cmd.idempotency_key:
                    existing = self._notifications.find_by_idempotency_key(
                        recipient_id, cmd.idempotency_key
                    )
                    if existing:
                        duplicates.append(existing.id)
                        continue
                n = Notification.create(
                    recipient_id=recipient_id,
                    category_key=category.key,
                    priority=priority,
                    content=built.content,
                    channels=channels,
                    now=now,
                    deeplink=built.deeplink,
                    collapse_key=cmd.collapse_key,
                    idempotency_key=cmd.idempotency_key,
                    template_key=template.key if template else cmd.template_key,
                    scheduled_at=cmd.scheduled_at,
                    expires_at=cmd.expires_at,
                    metadata=cmd.metadata,
                )
                n.mark_queued(now)
                self._notifications.add(n)
                created.append(n)

            interactions: list[InteractionEvent] = []
            for n in created:
                interactions.extend(lifecycle_to_interactions(n))
            self._events.add_many(interactions)

            for n in created:
                uow.on_commit(
                    lambda n=n: self._queue.enqueue(n.id, n.priority, eta=n.scheduled_at)
                )
        return NotifyResult(created=tuple(n.id for n in created), duplicates=tuple(duplicates))
