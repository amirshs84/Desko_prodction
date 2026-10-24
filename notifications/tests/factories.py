"""سازندهٔ سبک موجودیت‌ها برای تست‌های دامنه و pipeline."""
from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from notifications.domain.entities import Notification, NotificationCategory, UserPreference
from notifications.domain.enums import ChannelType, Priority
from notifications.domain.value_objects import NotificationContent, QuietHours

TEHRAN = ZoneInfo("Asia/Tehran")


def now() -> datetime:
    return datetime(2026, 10, 24, 12, 0, tzinfo=TEHRAN)


def content(**overrides) -> NotificationContent:
    params = {"title": "عنوان تست", "body": "متن تست"}
    params.update(overrides)
    return NotificationContent(**params)


def category(**overrides) -> NotificationCategory:
    params = dict(
        key="tips",
        title="نکته‌ها",
        default_priority=Priority.LOW,
        default_channels=frozenset({ChannelType.PUSH, ChannelType.INBOX}),
        user_configurable=True,
        is_active=True,
    )
    params.update(overrides)
    return NotificationCategory(**params)


def preference(user_id: int = 1, **overrides) -> UserPreference:
    params = dict(
        user_id=user_id,
        quiet_hours=QuietHours.parse("23:00-07:00"),
        quiet_hours_enabled=True,
        timezone="Asia/Tehran",
    )
    params.update(overrides)
    return UserPreference(**params)


def notification(**overrides) -> Notification:
    clock = overrides.pop("now", now())
    params = dict(
        recipient_id=1,
        category_key="tips",
        priority=Priority.NORMAL,
        content=overrides.pop("content", content()),
        channels=overrides.pop("channels", {ChannelType.INBOX, ChannelType.PUSH}),
        now=clock,
    )
    params.update(overrides)
    return Notification.create(**params)


class FakeRateLimiter:
    def __init__(self) -> None:
        self.seen: dict[str, int] = {}

    def acquire(self, key: str, limit: int, window_seconds: int) -> bool:
        self.seen[key] = self.seen.get(key, 0) + 1
        return self.seen[key] <= limit
