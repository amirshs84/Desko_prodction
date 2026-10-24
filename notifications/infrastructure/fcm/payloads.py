"""Payload Builder های هر پلتفرم (Strategy).

قرارداد اصلی یک پیلود data-only نسخه‌دار است (``v=1``) که native اندروید و Service
Worker وب هر دو آن را رندر می‌کنند؛ پس دکمه، عکس، ثبت رسید/رد شدن روی هر دو
یکسان کار می‌کند. schema مرجع: ``notifications/contracts/push_payload_v1.schema.json``.

محدودیت FCM: کل data حداکثر 4KB و همه‌ی مقادیر باید string باشند.
"""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from ...domain.entities import Device, Notification
from ...domain.enums import Platform, Priority

PAYLOAD_VERSION = "1"
MAX_DATA_BYTES = 4000


@dataclass
class FcmMessageSpec:
    """نمایش مستقل از SDK یک پیام FCM (تست‌پذیر بدون firebase-admin)."""

    token: str
    data: dict[str, str]
    android: dict[str, Any] | None = None
    webpush: dict[str, Any] | None = None
    apns: dict[str, Any] | None = None
    extra: dict[str, Any] = field(default_factory=dict)


def _ttl_seconds(n: Notification, now: datetime) -> int:
    if not n.expires_at:
        return int(n.policy.default_ttl.total_seconds())
    return max(0, int((n.expires_at - now).total_seconds()))


def build_data(n: Notification) -> dict[str, str]:
    c = n.content
    data: dict[str, Any] = {
        "v": PAYLOAD_VERSION,
        "nid": str(n.id),
        "category": n.category_key,
        "priority": n.priority.value,
        "channel_id": n.policy.android_channel,
        "title": c.title,
        "body": c.body,
        "style": c.style.value,
        "deeplink": n.deeplink or "",
        "collapse_key": n.collapse_key or "",
        "expires_at": n.expires_at.isoformat() if n.expires_at else "",
    }
    if not c.media.is_empty():
        data["media"] = json.dumps(c.media.to_dict(), ensure_ascii=False)
    if c.actions:
        data["actions"] = json.dumps([a.to_dict() for a in c.actions], ensure_ascii=False)
    if c.lines:
        data["lines"] = json.dumps(list(c.lines), ensure_ascii=False)
    if c.progress is not None:
        data["progress"] = str(c.progress)
    if c.in_app:
        data["in_app"] = json.dumps(c.in_app.to_dict(), ensure_ascii=False)
    if c.data:
        data["data"] = json.dumps(c.data, ensure_ascii=False)
    return _fit(data)


def _size(data: dict[str, str]) -> int:
    return len(json.dumps(data, ensure_ascii=False).encode("utf-8"))


def _fit(data: dict[str, str]) -> dict[str, str]:
    """اگر از 4KB بیشتر شد، به ترتیب کم‌اهمیت‌ترها را حذف و در آخر متن را کوتاه می‌کند."""
    for key in ("data", "lines", "in_app"):
        if _size(data) <= MAX_DATA_BYTES:
            return data
        if key in data:
            data.pop(key)
            data["truncated"] = "1"
    while _size(data) > MAX_DATA_BYTES and len(data["body"]) > 40:
        data["body"] = data["body"][: int(len(data["body"]) * 0.8)] + "…"
        data["truncated"] = "1"
    return data


class PayloadBuilder(ABC):
    platform: Platform

    @abstractmethod
    def build(self, n: Notification, device: Device, now: datetime) -> FcmMessageSpec: ...


class AndroidPayloadBuilder(PayloadBuilder):
    """data-only: سرویس native خودش نوتیف را می‌سازد (دکمه، عکس، deleteIntent)."""

    platform = Platform.ANDROID

    def build(self, n: Notification, device: Device, now: datetime) -> FcmMessageSpec:
        android: dict[str, Any] = {
            "priority": n.policy.fcm_priority,
            "ttl": _ttl_seconds(n, now),
        }
        if n.collapse_key:
            android["collapse_key"] = n.collapse_key[:64]
        return FcmMessageSpec(token=device.token, data=build_data(n), android=android)


class WebPayloadBuilder(PayloadBuilder):
    """data-only هم برای وب: Service Worker با ``showNotification`` و اکشن‌ها نمایش می‌دهد."""

    platform = Platform.WEB

    def __init__(self, link_base: str) -> None:
        self._link_base = link_base.rstrip("/")

    def build(self, n: Notification, device: Device, now: datetime) -> FcmMessageSpec:
        data = build_data(n)
        data["link"] = f"{self._link_base}{n.deeplink or '/'}"
        headers = {
            "TTL": str(_ttl_seconds(n, now)),
            "Urgency": "high" if n.priority in (Priority.CRITICAL, Priority.HIGH) else "normal",
        }
        if n.collapse_key:
            headers["Topic"] = "".join(ch for ch in n.collapse_key if ch.isalnum())[:32]
        return FcmMessageSpec(token=device.token, data=data, webpush={"headers": headers})


class ApnsPayloadBuilder(PayloadBuilder):
    """آماده برای iOS آینده: alert قابل نمایش + mutable-content برای Notification Service Extension."""

    platform = Platform.IOS

    def build(self, n: Notification, device: Device, now: datetime) -> FcmMessageSpec:
        aps: dict[str, Any] = {
            "alert": {"title": n.content.title, "body": n.content.body},
            "mutable-content": 1,
            "sound": "default",
        }
        if n.content.actions:
            aps["category"] = f"{n.category_key}:{','.join(a.id for a in n.content.actions)}"
        if n.collapse_key:
            aps["thread-id"] = n.collapse_key
        if n.priority == Priority.CRITICAL:
            aps["interruption-level"] = "time-sensitive"
        headers = {
            "apns-priority": "10" if n.policy.fcm_priority == "high" else "5",
            "apns-expiration": str(int(n.expires_at.timestamp())) if n.expires_at else "0",
        }
        if n.collapse_key:
            headers["apns-collapse-id"] = n.collapse_key[:64]
        return FcmMessageSpec(
            token=device.token,
            data=build_data(n),
            apns={"headers": headers, "payload": {"aps": aps}},
        )


def default_builders(link_base: str) -> dict[Platform, PayloadBuilder]:
    builders: list[PayloadBuilder] = [
        AndroidPayloadBuilder(),
        WebPayloadBuilder(link_base),
        ApnsPayloadBuilder(),
    ]
    return {b.platform: b for b in builders}
