"""TrackingService — دریافت دسته‌ای رویدادهای کلاینت (رسید، نمایش، باز شدن، کلیک دکمه، رد شدن)."""
from __future__ import annotations

from collections.abc import Callable
from datetime import timedelta

from ...domain.entities import InteractionEvent
from ...domain.enums import EventSource, EventType
from ...domain.errors import InvalidNotification
from ...domain.repositories import InteractionEventRepository, NotificationRepository
from ..commands import TrackBatchCommand, TrackBatchResult
from ..ports import Clock, UnitOfWork

MAX_BATCH = 100
# رویدادهای خیلی قدیمی یا آینده (ساعت خراب دستگاه) به زمان دریافت clamp می‌شوند
MAX_CLOCK_SKEW = timedelta(days=7)
READ_EVENTS = {EventType.OPENED, EventType.ACTION_CLICKED}


class TrackingService:
    def __init__(
        self,
        *,
        events: InteractionEventRepository,
        notifications: NotificationRepository,
        clock: Clock,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._events = events
        self._notifications = notifications
        self._clock = clock
        self._uow = uow_factory

    def ingest(self, cmd: TrackBatchCommand) -> TrackBatchResult:
        if len(cmd.events) > MAX_BATCH:
            raise InvalidNotification(f"حداکثر {MAX_BATCH} رویداد در هر درخواست.")
        now = self._clock.now()
        accepted: list[InteractionEvent] = []
        to_mark_read = set()
        rejected = 0
        owned_cache: dict = {}

        for e in cmd.events:
            if e.type not in EventType.client_reportable():
                rejected += 1
                continue
            category = e.category
            source = EventSource.LOCAL_CLIENT
            if e.notification_id:
                if e.notification_id not in owned_cache:
                    owned_cache[e.notification_id] = self._notifications.get(e.notification_id)
                n = owned_cache[e.notification_id]
                if n is None or n.recipient_id != cmd.user_id:
                    rejected += 1
                    continue
                category = n.category_key
                source = EventSource.SERVER
                if e.type in READ_EVENTS:
                    to_mark_read.add(n.id)
            elif e.local_source_key:
                source = EventSource.LOCAL_SCHEDULED

            occurred = e.occurred_at
            if abs(occurred - now) > MAX_CLOCK_SKEW:
                occurred = now
            metadata = dict(e.metadata)
            if e.local_source_key:
                metadata["local_source_key"] = e.local_source_key
            accepted.append(
                InteractionEvent(
                    client_event_id=e.client_event_id,
                    type=e.type,
                    user_id=cmd.user_id,
                    occurred_at=occurred,
                    source=source,
                    notification_id=e.notification_id,
                    device_id=cmd.device_id,
                    category_key=category[:64],
                    action_id=e.action_id[:32],
                    metadata=metadata,
                )
            )

        with self._uow():
            inserted = self._events.add_many(accepted)
            if to_mark_read:
                self._notifications.mark_read(cmd.user_id, to_mark_read, now)
        return TrackBatchResult(
            accepted=inserted, duplicates=len(accepted) - inserted, rejected=rejected
        )
