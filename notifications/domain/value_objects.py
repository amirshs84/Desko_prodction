"""Value Object های نوتیفیکیشن: immutable و خوداعتبارسنج."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, tzinfo
from typing import Any
from zoneinfo import ZoneInfo

from .enums import ActionType, ContentStyle, InAppLayout
from .errors import InvalidNotification

MAX_ACTIONS = 3
MAX_TITLE = 120
MAX_BODY = 1000
MAX_INBOX_LINES = 6
_ACTION_ID = re.compile(r"^[a-z0-9_]{1,32}$")


@dataclass(frozen=True)
class NotificationAction:
    id: str
    title: str
    type: ActionType = ActionType.OPEN
    deeplink: str | None = None
    # فقط برای API_CALL: مسیر نسبی زیر /api/ که کلاینت بدون باز کردن اپ صدا می‌زند.
    api_path: str | None = None

    def __post_init__(self) -> None:
        if not _ACTION_ID.match(self.id):
            raise InvalidNotification(f"شناسه‌ی اکشن نامعتبر است: {self.id!r}")
        if not self.title or len(self.title) > 40:
            raise InvalidNotification("عنوان اکشن باید بین ۱ تا ۴۰ کاراکتر باشد.")
        if self.type == ActionType.API_CALL and not self.api_path:
            raise InvalidNotification("اکشن API_CALL نیازمند api_path است.")
        if self.api_path and (self.api_path.startswith("/") or "://" in self.api_path):
            raise InvalidNotification("api_path باید مسیر نسبی زیر /api/ باشد.")

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {"id": self.id, "title": self.title, "type": self.type.value}
        if self.deeplink:
            data["deeplink"] = self.deeplink
        if self.api_path:
            data["api_path"] = self.api_path
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NotificationAction":
        return cls(
            id=data["id"],
            title=data["title"],
            type=ActionType(data.get("type", ActionType.OPEN.value)),
            deeplink=data.get("deeplink"),
            api_path=data.get("api_path"),
        )


@dataclass(frozen=True)
class Media:
    image_url: str | None = None
    large_icon_url: str | None = None
    lottie_url: str | None = None

    def __post_init__(self) -> None:
        for url in (self.image_url, self.large_icon_url, self.lottie_url):
            if url and not url.startswith(("https://", "http://", "/")):
                raise InvalidNotification(f"آدرس رسانه نامعتبر است: {url!r}")

    def is_empty(self) -> bool:
        return not (self.image_url or self.large_icon_url or self.lottie_url)

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in {
            "image_url": self.image_url,
            "large_icon_url": self.large_icon_url,
            "lottie_url": self.lottie_url,
        }.items() if v}

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "Media":
        data = data or {}
        return cls(
            image_url=data.get("image_url"),
            large_icon_url=data.get("large_icon_url"),
            lottie_url=data.get("lottie_url"),
        )


@dataclass(frozen=True)
class InAppSpec:
    """نمایش داخل اپ (مودال/شیت/تمام‌صفحه) — جایگاه انیمیشن Lottie."""

    layout: InAppLayout = InAppLayout.MODAL
    dismissible: bool = True
    background_color: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {"layout": self.layout.value, "dismissible": self.dismissible}
        if self.background_color:
            data["background_color"] = self.background_color
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "InAppSpec | None":
        if not data:
            return None
        return cls(
            layout=InAppLayout(data.get("layout", InAppLayout.MODAL.value)),
            dismissible=bool(data.get("dismissible", True)),
            background_color=data.get("background_color"),
        )


@dataclass(frozen=True)
class NotificationContent:
    title: str
    body: str = ""
    style: ContentStyle = ContentStyle.BASIC
    media: Media = field(default_factory=Media)
    actions: tuple[NotificationAction, ...] = ()
    # برای استایل INBOX (خطوط خلاصه) و PROGRESS (0..100)
    lines: tuple[str, ...] = ()
    progress: int | None = None
    in_app: InAppSpec | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.title or len(self.title) > MAX_TITLE:
            raise InvalidNotification(f"عنوان باید بین ۱ تا {MAX_TITLE} کاراکتر باشد.")
        if len(self.body) > MAX_BODY:
            raise InvalidNotification(f"متن نباید بیش از {MAX_BODY} کاراکتر باشد.")
        if len(self.actions) > MAX_ACTIONS:
            raise InvalidNotification(f"حداکثر {MAX_ACTIONS} اکشن مجاز است.")
        ids = [a.id for a in self.actions]
        if len(ids) != len(set(ids)):
            raise InvalidNotification("شناسه‌ی اکشن‌ها باید یکتا باشد.")
        if self.style == ContentStyle.BIG_PICTURE and not self.media.image_url:
            raise InvalidNotification("استایل BIG_PICTURE نیازمند image_url است.")
        if self.style == ContentStyle.INBOX and not (1 <= len(self.lines) <= MAX_INBOX_LINES):
            raise InvalidNotification(f"استایل INBOX نیازمند ۱ تا {MAX_INBOX_LINES} خط است.")
        if self.style == ContentStyle.PROGRESS and not (
            self.progress is not None and 0 <= self.progress <= 100
        ):
            raise InvalidNotification("استایل PROGRESS نیازمند progress بین ۰ تا ۱۰۰ است.")
        if self.data and not all(isinstance(k, str) for k in self.data):
            raise InvalidNotification("کلیدهای data باید رشته باشند.")

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {"title": self.title, "body": self.body, "style": self.style.value}
        if not self.media.is_empty():
            data["media"] = self.media.to_dict()
        if self.actions:
            data["actions"] = [a.to_dict() for a in self.actions]
        if self.lines:
            data["lines"] = list(self.lines)
        if self.progress is not None:
            data["progress"] = self.progress
        if self.in_app:
            data["in_app"] = self.in_app.to_dict()
        if self.data:
            data["data"] = dict(self.data)
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "NotificationContent":
        return cls(
            title=data["title"],
            body=data.get("body", ""),
            style=ContentStyle(data.get("style", ContentStyle.BASIC.value)),
            media=Media.from_dict(data.get("media")),
            actions=tuple(NotificationAction.from_dict(a) for a in data.get("actions") or ()),
            lines=tuple(data.get("lines") or ()),
            progress=data.get("progress"),
            in_app=InAppSpec.from_dict(data.get("in_app")),
            data=dict(data.get("data") or {}),
        )


@dataclass(frozen=True)
class QuietHours:
    """بازه‌ی سکوت روزانه به وقت محلی کاربر؛ می‌تواند از نیمه‌شب عبور کند (23:00-07:00)."""

    start: time
    end: time

    def __post_init__(self) -> None:
        if self.start == self.end:
            raise InvalidNotification("ابتدا و انتهای ساعت سکوت نباید برابر باشد.")

    @classmethod
    def parse(cls, value: str) -> "QuietHours":
        try:
            a, b = value.split("-")
            return cls(time.fromisoformat(a.strip()), time.fromisoformat(b.strip()))
        except (ValueError, AttributeError) as exc:
            raise InvalidNotification(f"فرمت ساعت سکوت نامعتبر است: {value!r}") from exc

    def format(self) -> str:
        return f"{self.start.strftime('%H:%M')}-{self.end.strftime('%H:%M')}"

    def contains(self, local: time) -> bool:
        if self.start < self.end:
            return self.start <= local < self.end
        return local >= self.start or local < self.end

    def next_end(self, now: datetime, tz: tzinfo) -> datetime:
        """اولین لحظه‌ی پایان سکوت بعد از ``now`` (aware) — برای defer."""
        local = now.astimezone(tz)
        candidate = local.replace(
            hour=self.end.hour, minute=self.end.minute, second=0, microsecond=0
        )
        if candidate <= local:
            candidate += timedelta(days=1)
        return candidate


def safe_zone(name: str | None, default: str = "Asia/Tehran") -> ZoneInfo:
    try:
        return ZoneInfo(name or default)
    except Exception:  # noqa: BLE001 - timezone نامعتبر از کلاینت
        return ZoneInfo(default)
