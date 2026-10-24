"""DispatchService — اجرای pipeline و تحویل روی کانال‌ها برای یک نوتیف.

جریان:
  claim اتمیک → pipeline (فقط بار اول) → کانال‌ها به ترتیب → ثبت attempt و رویداد.

اگر push خطای موقت بدهد، کانال‌های تحویل‌شده در metadata ثبت می‌شوند و
``PushProviderError`` به لایه‌ی صف می‌رسد تا retry کند؛ در retry فقط کانال‌های
باقی‌مانده ارسال می‌شوند و pipeline دوباره اجرا نمی‌شود (سهمیه دوباره مصرف نشود).
"""
from __future__ import annotations

import logging
import uuid
from collections.abc import Callable
from datetime import timedelta

from ...domain.entities import DeliveryAttempt, Notification, UserPreference
from ...domain.enums import DeliveryStatus, NotificationStatus, SuppressionReason
from ...domain.errors import PushProviderError
from ...domain.repositories import (
    CategoryRepository,
    DeliveryAttemptRepository,
    InteractionEventRepository,
    NotificationRepository,
    PreferenceRepository,
)
from ..channels import ChannelRegistry
from ..pipeline import NotificationPipeline, PipelineContext, Verdict
from ..ports import Clock, NotificationQueue, UnitOfWork
from .events import lifecycle_to_interactions

logger = logging.getLogger(__name__)

PIPELINE_PASSED = "pipeline_passed"
DELIVERED_CHANNELS = "delivered_channels"


class DispatchService:
    def __init__(
        self,
        *,
        notifications: NotificationRepository,
        categories: CategoryRepository,
        preferences: PreferenceRepository,
        attempts: DeliveryAttemptRepository,
        events: InteractionEventRepository,
        pipeline: NotificationPipeline,
        channels: ChannelRegistry,
        queue: NotificationQueue,
        clock: Clock,
        uow_factory: Callable[[], UnitOfWork],
        default_preference: Callable[[int], UserPreference],
    ) -> None:
        self._notifications = notifications
        self._categories = categories
        self._preferences = preferences
        self._attempts = attempts
        self._events = events
        self._pipeline = pipeline
        self._channels = channels
        self._queue = queue
        self._clock = clock
        self._uow = uow_factory
        self._default_preference = default_preference

    def dispatch(self, notification_id: uuid.UUID, *, final_attempt: bool = False) -> NotificationStatus | None:
        now = self._clock.now()
        if not self._notifications.claim_for_dispatch(notification_id, now):
            return None  # قبلاً پردازش شده، توسط worker دیگری در حال ارسال است یا هنوز موعدش نرسیده
        n = self._notifications.get(notification_id)
        if n is None:
            return None

        if not n.metadata.get(PIPELINE_PASSED):
            category = self._categories.get(n.category_key)
            if category is None:
                n.suppress(SuppressionReason.CATEGORY_DISABLED, now)
                self._persist(n, [])
                return n.status
            preference = self._preferences.get(n.recipient_id) or self._default_preference(
                n.recipient_id
            )
            result = self._pipeline.run(PipelineContext(n, category, preference, now))
            if result.verdict == Verdict.SUPPRESS:
                n.suppress(result.reason, now, stage=result.stage, detail=result.detail)
                self._persist(n, [])
                return n.status
            if result.verdict == Verdict.DEFER:
                n.defer(result.until, now, reason=result.detail or result.stage)
                self._persist(n, [])
                self._queue.enqueue(n.id, n.priority, eta=result.until)
                return n.status
            n.metadata[PIPELINE_PASSED] = True

        delivered = set(n.metadata.get(DELIVERED_CHANNELS, []))
        attempts: list[DeliveryAttempt] = []
        retry_error: PushProviderError | None = None
        for channel in self._channels.ordered(n.channels):
            if channel.type.value in delivered:
                continue
            try:
                channel_attempts = channel.deliver(n, now)
            except PushProviderError as exc:
                if not exc.retryable or final_attempt:
                    attempts.append(self._failed_attempt(n, channel.type, now, str(exc)))
                    delivered.add(channel.type.value)
                    continue
                retry_error = exc
                continue
            attempts.extend(channel_attempts)
            delivered.add(channel.type.value)

        n.metadata[DELIVERED_CHANNELS] = sorted(delivered)
        if retry_error is not None:
            n.mark_failed(now, str(retry_error))
            self._persist(n, attempts)
            raise retry_error

        sent = sorted({a.channel.value for a in attempts if a.status == DeliveryStatus.SENT})
        if sent:
            n.mark_dispatched(now, sent)
        elif attempts and all(a.status == DeliveryStatus.SKIPPED for a in attempts):
            n.suppress(SuppressionReason.NO_CHANNEL, now)
        else:
            n.mark_failed(now, "no channel delivered")
        self._persist(n, attempts)
        return n.status

    def release_due(self, limit: int = 500) -> int:
        """نوتیف‌های معوقِ سررسیده و نوتیف‌های گیرکرده را دوباره صف می‌کند (Celery beat)."""
        now = self._clock.now()
        due = self._notifications.due_deferred(now, limit)
        stale = self._notifications.requeue_stale(now - timedelta(minutes=15))
        for n in due + stale:
            self._queue.enqueue(n.id, n.priority)
        return len(due) + len(stale)

    def _persist(self, n: Notification, attempts: list[DeliveryAttempt]) -> None:
        with self._uow():
            self._notifications.save(n)
            if attempts:
                self._attempts.add_many(attempts)
            self._events.add_many(lifecycle_to_interactions(n))

    @staticmethod
    def _failed_attempt(n: Notification, channel, now, error: str) -> DeliveryAttempt:
        return DeliveryAttempt(
            id=uuid.uuid4(),
            notification_id=n.id,
            channel=channel,
            status=DeliveryStatus.FAILED,
            created_at=now,
            error=error,
        )
