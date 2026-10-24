"""Command های ورودی سرویس‌ها (immutable)."""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from ..domain.enums import ChannelType, EventType, Platform, Priority


@dataclass(frozen=True)
class NotifyCommand:
    """درخواست ارسال. یا ``template_key`` (+context) یا ``title`` باید باشد.

    فیلدهای محتوا (title, body, style, media, actions, ...) اگر داده شوند روی قالب
    override می‌شوند.
    """

    recipient_ids: tuple[int, ...]
    category: str
    template_key: str | None = None
    context: dict[str, Any] = field(default_factory=dict)
    title: str | None = None
    body: str | None = None
    content_options: dict[str, Any] = field(default_factory=dict)
    priority: Priority | None = None
    channels: frozenset[ChannelType] | None = None
    deeplink: str | None = None
    collapse_key: str | None = None
    idempotency_key: str | None = None
    scheduled_at: datetime | None = None
    expires_at: datetime | None = None
    locale: str = "fa"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class NotifyResult:
    created: tuple[uuid.UUID, ...]
    duplicates: tuple[uuid.UUID, ...]


@dataclass(frozen=True)
class RegisterDeviceCommand:
    user_id: int
    platform: Platform
    token: str
    app_version: str = ""
    locale: str = "fa"
    timezone: str = "Asia/Tehran"


@dataclass(frozen=True)
class TrackEvent:
    client_event_id: uuid.UUID
    type: EventType
    occurred_at: datetime
    notification_id: uuid.UUID | None = None
    local_source_key: str = ""
    category: str = ""
    action_id: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class TrackBatchCommand:
    user_id: int
    events: tuple[TrackEvent, ...]
    device_id: uuid.UUID | None = None


@dataclass(frozen=True)
class TrackBatchResult:
    accepted: int
    duplicates: int
    rejected: int


@dataclass(frozen=True)
class ChannelToggle:
    category: str
    channel: ChannelType
    enabled: bool


@dataclass(frozen=True)
class UpdatePreferencesCommand:
    user_id: int
    toggles: tuple[ChannelToggle, ...] = ()
    quiet_hours: str | None = None  # "HH:MM-HH:MM"؛ رشته‌ی خالی = حذف
    quiet_hours_enabled: bool | None = None
    timezone: str | None = None
    muted_until: datetime | None = None
    clear_mute: bool = False


@dataclass(frozen=True)
class ScheduleLocalCommand:
    user_id: int
    source_key: str
    category: str
    fire_at: datetime
    template_key: str | None = None
    context: dict[str, Any] = field(default_factory=dict)
    title: str | None = None
    body: str | None = None
    content_options: dict[str, Any] = field(default_factory=dict)
    deeplink: str | None = None
    priority: Priority | None = None
    locale: str = "fa"
