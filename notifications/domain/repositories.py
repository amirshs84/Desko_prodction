"""Port های persistence (Dependency Inversion: دامنه/اپلیکیشن فقط این‌ها را می‌شناسند)."""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from collections.abc import Iterable
from datetime import datetime

from .entities import (
    DeliveryAttempt,
    Device,
    InteractionEvent,
    LocalReminder,
    Notification,
    NotificationCategory,
    NotificationTemplate,
    UserPreference,
)
from .enums import Platform


class NotificationRepository(ABC):
    @abstractmethod
    def add(self, notification: Notification) -> None: ...

    @abstractmethod
    def save(self, notification: Notification) -> None: ...

    @abstractmethod
    def get(self, notification_id: uuid.UUID) -> Notification | None: ...

    @abstractmethod
    def find_by_idempotency_key(self, recipient_id: int, key: str) -> Notification | None: ...

    @abstractmethod
    def find_recent_by_collapse_key(
        self, recipient_id: int, collapse_key: str, since: datetime, exclude_id: uuid.UUID
    ) -> Notification | None: ...

    @abstractmethod
    def claim_for_dispatch(self, notification_id: uuid.UUID, now: datetime) -> bool:
        """گذار اتمیک به DISPATCHING؛ فقط یک worker موفق می‌شود."""

    @abstractmethod
    def due_deferred(self, now: datetime, limit: int) -> list[Notification]: ...

    @abstractmethod
    def requeue_stale(self, stuck_before: datetime) -> list[Notification]:
        """نوتیف‌هایی که worker وسط ارسال از دست داده (DISPATCHING قدیمی) → FAILED برای ارسال مجدد."""

    @abstractmethod
    def pending_in_app(self, recipient_id: int, since: datetime, limit: int) -> list[Notification]: ...

    @abstractmethod
    def list_inbox(
        self, recipient_id: int, *, before: datetime | None, limit: int, unread_only: bool
    ) -> list[Notification]: ...

    @abstractmethod
    def unread_count(self, recipient_id: int) -> int: ...

    @abstractmethod
    def mark_read(self, recipient_id: int, ids: Iterable[uuid.UUID] | None, now: datetime) -> int:
        """ids=None یعنی همه."""


class DeviceRepository(ABC):
    @abstractmethod
    def get(self, device_id: uuid.UUID) -> Device | None: ...

    @abstractmethod
    def get_by_token(self, token: str) -> Device | None: ...

    @abstractmethod
    def save(self, device: Device) -> None: ...

    @abstractmethod
    def active_for_user(
        self, user_id: int, platforms: set[Platform] | None = None
    ) -> list[Device]: ...

    @abstractmethod
    def deactivate_tokens(self, tokens: Iterable[str]) -> int: ...


class CategoryRepository(ABC):
    @abstractmethod
    def get(self, key: str) -> NotificationCategory | None: ...

    @abstractmethod
    def list_active(self) -> list[NotificationCategory]: ...


class TemplateRepository(ABC):
    @abstractmethod
    def get(self, key: str, locale: str) -> NotificationTemplate | None:
        """با fallback به locale پیش‌فرض (fa)."""


class PreferenceRepository(ABC):
    @abstractmethod
    def get(self, user_id: int) -> UserPreference | None: ...

    @abstractmethod
    def save(self, preference: UserPreference) -> None: ...


class DeliveryAttemptRepository(ABC):
    @abstractmethod
    def add_many(self, attempts: list[DeliveryAttempt]) -> None: ...


class InteractionEventRepository(ABC):
    @abstractmethod
    def add_many(self, events: list[InteractionEvent]) -> int:
        """رویدادهای تکراری (همان client_event_id) نادیده گرفته می‌شوند؛ تعداد درج‌شده برمی‌گردد."""


class LocalReminderRepository(ABC):
    @abstractmethod
    def upsert(self, reminder: LocalReminder) -> LocalReminder: ...

    @abstractmethod
    def cancel(self, user_id: int, source_key: str, now: datetime) -> bool: ...

    @abstractmethod
    def changed_since(
        self, user_id: int, since: datetime | None, horizon: datetime
    ) -> list[LocalReminder]: ...

    @abstractmethod
    def list_active_by_prefix(
        self, user_id: int, prefix: str, after: datetime
    ) -> list[LocalReminder]: ...
