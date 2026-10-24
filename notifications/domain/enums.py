"""شمارش‌های دامنه‌ی نوتیفیکیشن (تک‌منبع حقیقت برای همه‌ی لایه‌ها)."""
from __future__ import annotations

from enum import Enum


class StrEnum(str, Enum):
    def __str__(self) -> str:  # pragma: no cover - نمایش
        return self.value

    @classmethod
    def values(cls) -> list[str]:
        return [m.value for m in cls]


class Priority(StrEnum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"


class ChannelType(StrEnum):
    PUSH = "PUSH"
    REALTIME = "REALTIME"
    INBOX = "INBOX"
    IN_APP = "IN_APP"


class Platform(StrEnum):
    ANDROID = "ANDROID"
    WEB = "WEB"
    IOS = "IOS"


class NotificationStatus(StrEnum):
    PENDING = "PENDING"
    DEFERRED = "DEFERRED"
    # توسط یک worker برداشته شده (claim اتمیک) تا دو worker یک نوتیف را دوبار نفرستند.
    DISPATCHING = "DISPATCHING"
    SUPPRESSED = "SUPPRESSED"
    DISPATCHED = "DISPATCHED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class ContentStyle(StrEnum):
    BASIC = "BASIC"
    BIG_TEXT = "BIG_TEXT"
    BIG_PICTURE = "BIG_PICTURE"
    INBOX = "INBOX"
    PROGRESS = "PROGRESS"


class ActionType(StrEnum):
    OPEN = "OPEN"
    DISMISS = "DISMISS"
    API_CALL = "API_CALL"


class InAppLayout(StrEnum):
    MODAL = "MODAL"
    BOTTOM_SHEET = "BOTTOM_SHEET"
    FULLSCREEN = "FULLSCREEN"
    BANNER = "BANNER"


class DeliveryStatus(StrEnum):
    SENT = "SENT"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class EventSource(StrEnum):
    SERVER = "SERVER"
    LOCAL_SCHEDULED = "LOCAL_SCHEDULED"
    LOCAL_CLIENT = "LOCAL_CLIENT"


class EventType(StrEnum):
    # سمت سرور
    CREATED = "CREATED"
    SUPPRESSED = "SUPPRESSED"
    DEFERRED = "DEFERRED"
    QUEUED = "QUEUED"
    SENT = "SENT"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    # سمت کلاینت
    DELIVERED = "DELIVERED"
    DISPLAYED = "DISPLAYED"
    OPENED = "OPENED"
    ACTION_CLICKED = "ACTION_CLICKED"
    DISMISSED = "DISMISSED"

    @classmethod
    def client_reportable(cls) -> set["EventType"]:
        return {cls.DELIVERED, cls.DISPLAYED, cls.OPENED, cls.ACTION_CLICKED, cls.DISMISSED}


class SuppressionReason(StrEnum):
    USER_PREFERENCE = "USER_PREFERENCE"
    CATEGORY_DISABLED = "CATEGORY_DISABLED"
    DUPLICATE = "DUPLICATE"
    FREQUENCY_CAP = "FREQUENCY_CAP"
    EXPIRED = "EXPIRED"
    NO_CHANNEL = "NO_CHANNEL"
