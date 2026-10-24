from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from ..domain.enums import Priority


@dataclass(frozen=True)
class NotificationConfig:
    delivery_mode: str
    firebase_credentials: str
    default_quiet_hours: str
    daily_caps: dict
    dedupe_window_seconds: int
    web_link_base: str


def load_config() -> NotificationConfig:
    return NotificationConfig(
        delivery_mode=getattr(settings, "NOTIF_DELIVERY_MODE", "inline"),
        firebase_credentials=getattr(settings, "FIREBASE_CREDENTIALS", ""),
        default_quiet_hours=getattr(settings, "NOTIF_DEFAULT_QUIET_HOURS", "23:00-07:00"),
        daily_caps={
            Priority.NORMAL: getattr(settings, "NOTIF_DAILY_CAP_NORMAL", 10),
            Priority.LOW: getattr(settings, "NOTIF_DAILY_CAP_LOW", 3),
        },
        dedupe_window_seconds=getattr(settings, "NOTIF_DEDUPE_WINDOW_SECONDS", 600),
        web_link_base=getattr(settings, "NOTIF_WEB_LINK_BASE", "https://space.mydesko.ir"),
    )
