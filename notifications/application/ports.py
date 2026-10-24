"""Port های لایه‌ی اپلیکیشن به دنیای بیرون (زیرساخت پشت این interfaceها تعویض‌پذیر است)."""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from ..domain.entities import Device, Notification
from ..domain.enums import Priority


class Clock(Protocol):
    def now(self) -> datetime: ...


class UnitOfWork(Protocol):
    def __enter__(self) -> "UnitOfWork": ...

    def __exit__(self, exc_type, exc, tb) -> bool | None: ...

    def on_commit(self, callback: Callable[[], None]) -> None: ...


@dataclass(frozen=True)
class PushResult:
    device_id: uuid.UUID
    success: bool
    message_id: str = ""
    error: str = ""
    # توکن دیگر معتبر نیست (UNREGISTERED/INVALID_ARGUMENT) → دستگاه غیرفعال شود
    token_invalid: bool = False
    retryable: bool = False


class PushGateway(ABC):
    """ارسال به سرویس پوش؛ قالب‌بندی مخصوص هر پلتفرم مسئولیت پیاده‌سازی است."""

    @abstractmethod
    def send(self, notification: Notification, devices: list[Device]) -> list[PushResult]: ...


class RealtimeGateway(ABC):
    @abstractmethod
    def send_to_user(self, user_id: int, event: str, payload: dict[str, Any]) -> None: ...


class TemplateRenderer(ABC):
    @abstractmethod
    def render(self, text: str, context: dict[str, Any]) -> str: ...


class RateLimiter(ABC):
    @abstractmethod
    def acquire(self, key: str, limit: int, window_seconds: int) -> bool:
        """اگر سهمیه باقی است مصرف و True؛ وگرنه False."""


class NotificationQueue(ABC):
    @abstractmethod
    def enqueue(
        self, notification_id: uuid.UUID, priority: Priority, eta: datetime | None = None
    ) -> None: ...
