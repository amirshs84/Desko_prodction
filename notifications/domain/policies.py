"""PriorityPolicy — رفتار هر سطح اهمیت در یک جا (Strategy).

هر جای سیستم که به «این اولویت چطور رفتار کند؟» نیاز دارد فقط از
``policy_for`` می‌پرسد؛ تغییر رفتار یک سطح، فقط همین جدول را عوض می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from .enums import Priority


@dataclass(frozen=True)
class PriorityPolicy:
    priority: Priority
    queue: str
    fcm_priority: str  # "high" | "normal"
    android_channel: str
    default_ttl: timedelta
    bypass_quiet_hours: bool
    bypass_frequency_cap: bool
    respect_user_opt_out: bool


_POLICIES: dict[Priority, PriorityPolicy] = {
    Priority.CRITICAL: PriorityPolicy(
        priority=Priority.CRITICAL,
        queue="notif_critical",
        fcm_priority="high",
        android_channel="desko_critical",
        default_ttl=timedelta(minutes=30),
        bypass_quiet_hours=True,
        bypass_frequency_cap=True,
        respect_user_opt_out=False,
    ),
    Priority.HIGH: PriorityPolicy(
        priority=Priority.HIGH,
        queue="notif_critical",
        fcm_priority="high",
        android_channel="desko_high",
        default_ttl=timedelta(hours=6),
        bypass_quiet_hours=False,
        bypass_frequency_cap=True,
        respect_user_opt_out=True,
    ),
    Priority.NORMAL: PriorityPolicy(
        priority=Priority.NORMAL,
        queue="notif_default",
        fcm_priority="normal",
        android_channel="desko_default",
        default_ttl=timedelta(days=1),
        bypass_quiet_hours=False,
        bypass_frequency_cap=False,
        respect_user_opt_out=True,
    ),
    Priority.LOW: PriorityPolicy(
        priority=Priority.LOW,
        queue="notif_bulk",
        fcm_priority="normal",
        android_channel="desko_low",
        default_ttl=timedelta(days=3),
        bypass_quiet_hours=False,
        bypass_frequency_cap=False,
        respect_user_opt_out=True,
    ),
}


def policy_for(priority: Priority) -> PriorityPolicy:
    return _POLICIES[Priority(priority)]
