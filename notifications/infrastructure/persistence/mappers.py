"""نگاشت دوطرفه‌ی مدل Django ↔ موجودیت دامنه."""
from __future__ import annotations

from ...domain.entities import (
    Device,
    LocalReminder,
    Notification,
    NotificationCategory,
    NotificationTemplate,
    UserPreference,
)
from ...domain.enums import (
    ChannelType,
    NotificationStatus,
    Platform,
    Priority,
    SuppressionReason,
)
from ...domain.value_objects import NotificationContent, QuietHours
from .models import (
    CategoryModel,
    DeviceModel,
    LocalReminderModel,
    NotificationModel,
    PreferenceModel,
    TemplateModel,
)


def _channels(values) -> frozenset[ChannelType]:
    return frozenset(ChannelType(v) for v in values or ())


def notification_to_entity(m: NotificationModel) -> Notification:
    return Notification(
        id=m.id,
        recipient_id=m.recipient_id,
        category_key=m.category_id,
        priority=Priority(m.priority),
        content=NotificationContent.from_dict(m.content),
        channels=_channels(m.channels),
        created_at=m.created_at,
        deeplink=m.deeplink or None,
        collapse_key=m.collapse_key or None,
        idempotency_key=m.idempotency_key,
        template_key=m.template_key or None,
        scheduled_at=m.scheduled_at,
        expires_at=m.expires_at,
        status=NotificationStatus(m.status),
        suppression_reason=SuppressionReason(m.suppression_reason) if m.suppression_reason else None,
        dispatched_at=m.dispatched_at,
        read_at=m.read_at,
        metadata=m.metadata or {},
    )


def notification_fields(n: Notification) -> dict:
    return {
        "recipient_id": n.recipient_id,
        "category_id": n.category_key,
        "priority": n.priority.value,
        "content": n.content.to_dict(),
        "channels": sorted(c.value for c in n.channels),
        "in_inbox": ChannelType.INBOX in n.channels,
        "in_app": ChannelType.IN_APP in n.channels,
        "deeplink": n.deeplink or "",
        "collapse_key": n.collapse_key or "",
        "idempotency_key": n.idempotency_key,
        "template_key": n.template_key or "",
        "scheduled_at": n.scheduled_at,
        "expires_at": n.expires_at,
        "status": n.status.value,
        "suppression_reason": n.suppression_reason.value if n.suppression_reason else "",
        "dispatched_at": n.dispatched_at,
        "read_at": n.read_at,
        "metadata": n.metadata,
        "created_at": n.created_at,
    }


def device_to_entity(m: DeviceModel) -> Device:
    return Device(
        id=m.id,
        user_id=m.user_id,
        platform=Platform(m.platform),
        token=m.token,
        tracking_secret=m.tracking_secret,
        created_at=m.created_at,
        last_seen_at=m.last_seen_at,
        app_version=m.app_version,
        locale=m.locale,
        timezone=m.timezone,
        is_active=m.is_active,
    )


def device_fields(d: Device) -> dict:
    return {
        "user_id": d.user_id,
        "platform": d.platform.value,
        "token": d.token,
        "tracking_secret": d.tracking_secret,
        "app_version": d.app_version,
        "locale": d.locale,
        "timezone": d.timezone,
        "is_active": d.is_active,
        "created_at": d.created_at,
        "last_seen_at": d.last_seen_at,
    }


def category_to_entity(m: CategoryModel) -> NotificationCategory:
    return NotificationCategory(
        key=m.key,
        title=m.title,
        description=m.description,
        default_priority=Priority(m.default_priority),
        default_channels=_channels(m.default_channels),
        user_configurable=m.user_configurable,
        is_active=m.is_active,
    )


def template_to_entity(m: TemplateModel) -> NotificationTemplate:
    return NotificationTemplate(
        key=m.key,
        category_key=m.category_id,
        locale=m.locale,
        title=m.title,
        body=m.body,
        content_options=m.content_options or {},
        deeplink=m.deeplink or None,
        priority=Priority(m.priority) if m.priority else None,
        channels=_channels(m.channels) if m.channels else None,
        is_active=m.is_active,
    )


def preference_to_entity(m: PreferenceModel) -> UserPreference:
    return UserPreference(
        user_id=m.user_id,
        disabled={(cat, ChannelType(ch)) for cat, ch in (m.disabled or [])},
        quiet_hours=QuietHours.parse(m.quiet_hours) if m.quiet_hours else None,
        quiet_hours_enabled=m.quiet_hours_enabled,
        timezone=m.timezone,
        muted_until=m.muted_until,
    )


def preference_fields(p: UserPreference) -> dict:
    return {
        "disabled": sorted([cat, ch.value] for cat, ch in p.disabled),
        "quiet_hours": p.quiet_hours.format() if p.quiet_hours else "",
        "quiet_hours_enabled": p.quiet_hours_enabled,
        "timezone": p.timezone,
        "muted_until": p.muted_until,
    }


def reminder_to_entity(m: LocalReminderModel) -> LocalReminder:
    return LocalReminder(
        id=m.id,
        user_id=m.user_id,
        source_key=m.source_key,
        category_key=m.category_key,
        fire_at=m.fire_at,
        content=NotificationContent.from_dict(m.content),
        updated_at=m.updated_at,
        deeplink=m.deeplink or None,
        priority=Priority(m.priority),
        cancelled=m.cancelled,
    )
