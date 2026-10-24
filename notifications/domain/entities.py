"""موجودیت‌های دامنه‌ی نوتیفیکیشن.

``Notification`` ریشه‌ی aggregate است: همه‌ی تغییر وضعیت‌ها از متدهای آن می‌گذرد
و هر تغییر یک رویداد چرخه‌ی عمر (``pending_events``) ثبت می‌کند که سرویس آن را
در لاگ append-only ذخیره می‌کند.
"""
from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any

from .enums import (
    ChannelType,
    DeliveryStatus,
    EventSource,
    EventType,
    NotificationStatus,
    Platform,
    Priority,
    SuppressionReason,
)
from .errors import InvalidNotification
from .policies import policy_for
from .value_objects import NotificationContent, QuietHours, safe_zone


@dataclass
class LifecycleEvent:
    type: EventType
    occurred_at: datetime
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class Notification:
    id: uuid.UUID
    recipient_id: int
    category_key: str
    priority: Priority
    content: NotificationContent
    channels: frozenset[ChannelType]
    created_at: datetime
    deeplink: str | None = None
    collapse_key: str | None = None
    idempotency_key: str | None = None
    template_key: str | None = None
    scheduled_at: datetime | None = None
    expires_at: datetime | None = None
    status: NotificationStatus = NotificationStatus.PENDING
    suppression_reason: SuppressionReason | None = None
    dispatched_at: datetime | None = None
    read_at: datetime | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    pending_events: list[LifecycleEvent] = field(default_factory=list, repr=False)

    @classmethod
    def create(
        cls,
        *,
        recipient_id: int,
        category_key: str,
        priority: Priority,
        content: NotificationContent,
        channels: set[ChannelType] | frozenset[ChannelType],
        now: datetime,
        deeplink: str | None = None,
        collapse_key: str | None = None,
        idempotency_key: str | None = None,
        template_key: str | None = None,
        scheduled_at: datetime | None = None,
        expires_at: datetime | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> "Notification":
        if not channels:
            raise InvalidNotification("حداقل یک کانال لازم است.")
        if deeplink and not deeplink.startswith("/"):
            raise InvalidNotification("deeplink باید مسیر داخلی اپ باشد (با / شروع شود).")
        if expires_at is None:
            expires_at = (scheduled_at or now) + policy_for(priority).default_ttl
        if expires_at <= now:
            raise InvalidNotification("زمان انقضا باید در آینده باشد.")
        notification = cls(
            id=uuid.uuid4(),
            recipient_id=recipient_id,
            category_key=category_key,
            priority=Priority(priority),
            content=content,
            channels=frozenset(channels),
            created_at=now,
            deeplink=deeplink,
            collapse_key=collapse_key,
            idempotency_key=idempotency_key,
            template_key=template_key,
            scheduled_at=scheduled_at,
            expires_at=expires_at,
            metadata=dict(metadata or {}),
        )
        notification._record(EventType.CREATED, now, priority=notification.priority.value)
        return notification

    # ---------- پرس‌وجو ----------

    @property
    def policy(self):
        return policy_for(self.priority)

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            NotificationStatus.SUPPRESSED,
            NotificationStatus.DISPATCHED,
            NotificationStatus.EXPIRED,
        }

    def is_expired(self, now: datetime) -> bool:
        return self.expires_at is not None and now >= self.expires_at

    def is_due(self, now: datetime) -> bool:
        return self.scheduled_at is None or self.scheduled_at <= now

    # ---------- تغییر وضعیت ----------

    def suppress(self, reason: SuppressionReason, now: datetime, **meta: Any) -> None:
        self._ensure_active()
        self.status = NotificationStatus.SUPPRESSED
        self.suppression_reason = reason
        self._record(EventType.SUPPRESSED, now, reason=reason.value, **meta)

    def defer(self, until: datetime, now: datetime, reason: str) -> None:
        self._ensure_active()
        if until <= now:
            raise InvalidNotification("زمان تعویق باید در آینده باشد.")
        self.status = NotificationStatus.DEFERRED
        self.scheduled_at = until
        self._record(EventType.DEFERRED, now, until=until.isoformat(), reason=reason)

    def restrict_channels(self, channels: set[ChannelType]) -> None:
        self.channels = frozenset(self.channels & channels)

    def mark_queued(self, now: datetime) -> None:
        self._ensure_active()
        self.status = NotificationStatus.PENDING
        self._record(EventType.QUEUED, now, queue=self.policy.queue)

    def mark_dispatched(self, now: datetime, channels: list[str]) -> None:
        self._ensure_active()
        self.status = NotificationStatus.DISPATCHED
        self.dispatched_at = now
        self._record(EventType.SENT, now, channels=channels)

    def mark_failed(self, now: datetime, error: str) -> None:
        self.status = NotificationStatus.FAILED
        self._record(EventType.FAILED, now, error=error[:500])

    def expire(self, now: datetime) -> None:
        self._ensure_active()
        self.status = NotificationStatus.EXPIRED
        self._record(EventType.EXPIRED, now)

    def mark_read(self, now: datetime) -> None:
        if self.read_at is None:
            self.read_at = now

    def pull_events(self) -> list[LifecycleEvent]:
        events, self.pending_events = self.pending_events, []
        return events

    def _ensure_active(self) -> None:
        if self.is_terminal:
            raise InvalidNotification(f"نوتیفیکیشن در وضعیت نهایی {self.status.value} است.")

    def _record(self, type_: EventType, now: datetime, **meta: Any) -> None:
        self.pending_events.append(LifecycleEvent(type=type_, occurred_at=now, metadata=meta))


@dataclass
class Device:
    id: uuid.UUID
    user_id: int
    platform: Platform
    token: str
    tracking_secret: str
    created_at: datetime
    last_seen_at: datetime
    app_version: str = ""
    locale: str = "fa"
    timezone: str = "Asia/Tehran"
    is_active: bool = True

    @classmethod
    def register(
        cls,
        *,
        user_id: int,
        platform: Platform,
        token: str,
        now: datetime,
        app_version: str = "",
        locale: str = "fa",
        timezone: str = "Asia/Tehran",
    ) -> "Device":
        if not token or len(token) > 512:
            raise InvalidNotification("توکن دستگاه نامعتبر است.")
        return cls(
            id=uuid.uuid4(),
            user_id=user_id,
            platform=Platform(platform),
            token=token,
            tracking_secret=secrets.token_urlsafe(32),
            created_at=now,
            last_seen_at=now,
            app_version=app_version,
            locale=locale,
            timezone=safe_zone(timezone).key,
        )

    def refresh(
        self, *, user_id: int, now: datetime, app_version: str, locale: str, timezone: str
    ) -> None:
        """همان توکن از کاربر دیگری ثبت شد (logout/login) → دستگاه به کاربر جدید منتقل و secret عوض می‌شود."""
        if user_id != self.user_id:
            self.user_id = user_id
            self.tracking_secret = secrets.token_urlsafe(32)
        self.app_version = app_version or self.app_version
        self.locale = locale or self.locale
        self.timezone = safe_zone(timezone or self.timezone).key
        self.last_seen_at = now
        self.is_active = True

    def deactivate(self) -> None:
        self.is_active = False


@dataclass
class NotificationCategory:
    key: str
    title: str
    default_priority: Priority
    default_channels: frozenset[ChannelType]
    description: str = ""
    user_configurable: bool = True
    is_active: bool = True


@dataclass
class NotificationTemplate:
    key: str
    category_key: str
    locale: str
    title: str
    body: str
    content_options: dict[str, Any] = field(default_factory=dict)
    deeplink: str | None = None
    priority: Priority | None = None
    channels: frozenset[ChannelType] | None = None
    is_active: bool = True


@dataclass
class UserPreference:
    user_id: int
    # (category_key, channel) هایی که کاربر خاموش کرده
    disabled: set[tuple[str, ChannelType]] = field(default_factory=set)
    quiet_hours: QuietHours | None = None
    quiet_hours_enabled: bool = True
    timezone: str = "Asia/Tehran"
    muted_until: datetime | None = None

    def allows(self, category_key: str, channel: ChannelType) -> bool:
        return (category_key, channel) not in self.disabled and (
            "*",
            channel,
        ) not in self.disabled

    def set_channel(self, category_key: str, channel: ChannelType, enabled: bool) -> None:
        if enabled:
            self.disabled.discard((category_key, channel))
        else:
            self.disabled.add((category_key, channel))

    def quiet_until(self, now: datetime) -> datetime | None:
        """اگر الان زمان سکوت است، لحظه‌ی پایان آن؛ وگرنه None."""
        if self.muted_until and now < self.muted_until:
            return self.muted_until
        if not (self.quiet_hours_enabled and self.quiet_hours):
            return None
        tz = safe_zone(self.timezone)
        if self.quiet_hours.contains(now.astimezone(tz).time()):
            return self.quiet_hours.next_end(now, tz)
        return None


@dataclass
class DeliveryAttempt:
    id: uuid.UUID
    notification_id: uuid.UUID
    channel: ChannelType
    status: DeliveryStatus
    created_at: datetime
    device_id: uuid.UUID | None = None
    provider_message_id: str = ""
    error: str = ""


@dataclass
class InteractionEvent:
    """یک سطر از لاگ append-only. ``client_event_id`` تضمین idempotency است."""

    client_event_id: uuid.UUID
    type: EventType
    user_id: int
    occurred_at: datetime
    source: EventSource = EventSource.SERVER
    notification_id: uuid.UUID | None = None
    device_id: uuid.UUID | None = None
    category_key: str = ""
    action_id: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LocalReminder:
    """نوتیفی که سرور تعریف می‌کند ولی دستگاه خودش در زمانش نمایش می‌دهد (بدون FCM)."""

    id: uuid.UUID
    user_id: int
    source_key: str  # یکتا به ازای کاربر، مثلا "planning_block:42"
    category_key: str
    fire_at: datetime
    content: NotificationContent
    updated_at: datetime
    deeplink: str | None = None
    priority: Priority = Priority.NORMAL
    cancelled: bool = False

    def is_stale(self, now: datetime, grace: timedelta = timedelta(minutes=5)) -> bool:
        return self.fire_at + grace < now
