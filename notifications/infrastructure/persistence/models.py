"""مدل‌های Django ماژول نوتیفیکیشن (فقط جزئیات ذخیره‌سازی؛ منطق در domain است)."""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q

from ...domain.enums import (
    ChannelType,
    DeliveryStatus,
    EventSource,
    EventType,
    NotificationStatus,
    Platform,
    Priority,
)


def _choices(enum) -> list[tuple[str, str]]:
    return [(m.value, m.value) for m in enum]


class CategoryModel(models.Model):
    key = models.CharField(max_length=64, primary_key=True)
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    default_priority = models.CharField(
        max_length=16, choices=_choices(Priority), default=Priority.NORMAL.value
    )
    default_channels = models.JSONField(default=list)
    user_configurable = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notif_category"
        verbose_name = "دسته‌ی نوتیفیکیشن"
        verbose_name_plural = "دسته‌های نوتیفیکیشن"

    def __str__(self) -> str:
        return f"{self.key} ({self.title})"


class TemplateModel(models.Model):
    key = models.CharField(max_length=64)
    locale = models.CharField(max_length=8, default="fa")
    category = models.ForeignKey(CategoryModel, on_delete=models.PROTECT, related_name="templates")
    title = models.CharField(max_length=255, help_text="متغیرها با {name}")
    body = models.TextField(blank=True, default="")
    content_options = models.JSONField(
        default=dict,
        blank=True,
        help_text="style, media, actions, lines, progress, in_app (همان قالب NotificationContent)",
    )
    deeplink = models.CharField(max_length=500, blank=True, default="")
    priority = models.CharField(max_length=16, choices=_choices(Priority), blank=True, default="")
    channels = models.JSONField(default=list, blank=True, help_text="خالی = پیش‌فرض دسته")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notif_template"
        verbose_name = "قالب نوتیفیکیشن"
        verbose_name_plural = "قالب‌های نوتیفیکیشن"
        constraints = [
            models.UniqueConstraint(fields=["key", "locale"], name="notif_template_key_locale_uniq")
        ]

    def __str__(self) -> str:
        return f"{self.key}[{self.locale}]"


class NotificationModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notif_notifications"
    )
    category = models.ForeignKey(CategoryModel, on_delete=models.PROTECT, related_name="+")
    priority = models.CharField(max_length=16, choices=_choices(Priority))
    content = models.JSONField()
    channels = models.JSONField(default=list)
    # کپی دنرمال از channels برای کوئری سریع (JSON contains روی SQLite پشتیبانی نمی‌شود)
    in_inbox = models.BooleanField(default=False)
    in_app = models.BooleanField(default=False)
    deeplink = models.CharField(max_length=500, blank=True, default="")
    collapse_key = models.CharField(max_length=128, blank=True, default="")
    idempotency_key = models.CharField(max_length=128, null=True, blank=True)
    template_key = models.CharField(max_length=64, blank=True, default="")
    scheduled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16, choices=_choices(NotificationStatus), default=NotificationStatus.PENDING.value
    )
    suppression_reason = models.CharField(max_length=32, blank=True, default="")
    claimed_at = models.DateTimeField(null=True, blank=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField()

    class Meta:
        db_table = "notif_notification"
        verbose_name = "نوتیفیکیشن"
        verbose_name_plural = "نوتیفیکیشن‌ها"
        indexes = [
            models.Index(fields=["recipient", "-created_at"], name="notif_recipient_created_idx"),
            models.Index(fields=["status", "scheduled_at"], name="notif_status_sched_idx"),
            models.Index(
                fields=["recipient", "collapse_key", "created_at"], name="notif_collapse_idx"
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "idempotency_key"],
                condition=Q(idempotency_key__isnull=False),
                name="notif_idempotency_uniq",
            )
        ]

    def __str__(self) -> str:
        return f"{self.category_id} → {self.recipient_id} [{self.status}]"


class DeviceModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notif_devices"
    )
    platform = models.CharField(max_length=16, choices=_choices(Platform))
    token = models.CharField(max_length=512, unique=True)
    tracking_secret = models.CharField(max_length=64, db_index=True)
    app_version = models.CharField(max_length=32, blank=True, default="")
    locale = models.CharField(max_length=8, default="fa")
    timezone = models.CharField(max_length=64, default="Asia/Tehran")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField()
    last_seen_at = models.DateTimeField()

    class Meta:
        db_table = "notif_device"
        verbose_name = "دستگاه"
        verbose_name_plural = "دستگاه‌ها"
        indexes = [models.Index(fields=["user", "is_active"], name="notif_device_user_idx")]

    def __str__(self) -> str:
        return f"{self.platform} / {self.user_id}"


class PreferenceModel(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="notif_preference",
    )
    disabled = models.JSONField(default=list, blank=True, help_text="[[category_key, channel], ...]")
    quiet_hours = models.CharField(max_length=11, blank=True, default="", help_text="HH:MM-HH:MM")
    quiet_hours_enabled = models.BooleanField(default=True)
    timezone = models.CharField(max_length=64, default="Asia/Tehran")
    muted_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notif_preference"
        verbose_name = "تنظیمات نوتیف کاربر"
        verbose_name_plural = "تنظیمات نوتیف کاربران"


class DeliveryAttemptModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification = models.ForeignKey(
        NotificationModel, on_delete=models.CASCADE, related_name="attempts"
    )
    channel = models.CharField(max_length=16, choices=_choices(ChannelType))
    device = models.ForeignKey(DeviceModel, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=16, choices=_choices(DeliveryStatus))
    provider_message_id = models.CharField(max_length=255, blank=True, default="")
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField()

    class Meta:
        db_table = "notif_delivery_attempt"
        verbose_name = "تلاش ارسال"
        verbose_name_plural = "تلاش‌های ارسال"


class InteractionEventModel(models.Model):
    """لاگ append-only. notification_id عمداً FK نیست: نوتیف‌های لوکال رکورد سرور ندارند."""

    id = models.BigAutoField(primary_key=True)
    client_event_id = models.UUIDField(unique=True)
    type = models.CharField(max_length=24, choices=_choices(EventType))
    source = models.CharField(
        max_length=24, choices=_choices(EventSource), default=EventSource.SERVER.value
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notif_events"
    )
    notification_id = models.UUIDField(null=True, blank=True)
    device_id = models.UUIDField(null=True, blank=True)
    category_key = models.CharField(max_length=64, blank=True, default="")
    action_id = models.CharField(max_length=32, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField()
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notif_interaction_event"
        verbose_name = "رویداد نوتیف"
        verbose_name_plural = "رویدادهای نوتیف"
        indexes = [
            models.Index(fields=["notification_id", "type"], name="notif_event_notif_idx"),
            models.Index(fields=["occurred_at", "type"], name="notif_event_time_idx"),
            models.Index(fields=["category_key", "occurred_at"], name="notif_event_cat_idx"),
        ]


class LocalReminderModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notif_local_reminders"
    )
    source_key = models.CharField(max_length=128)
    category_key = models.CharField(max_length=64)
    priority = models.CharField(
        max_length=16, choices=_choices(Priority), default=Priority.NORMAL.value
    )
    fire_at = models.DateTimeField()
    content = models.JSONField()
    deeplink = models.CharField(max_length=500, blank=True, default="")
    cancelled = models.BooleanField(default=False)
    updated_at = models.DateTimeField()

    class Meta:
        db_table = "notif_local_reminder"
        verbose_name = "یادآور لوکال"
        verbose_name_plural = "یادآورهای لوکال"
        constraints = [
            models.UniqueConstraint(fields=["user", "source_key"], name="notif_local_source_uniq")
        ]
        indexes = [models.Index(fields=["user", "updated_at"], name="notif_local_user_upd_idx")]


class DailyStatsModel(models.Model):
    date = models.DateField()
    category_key = models.CharField(max_length=64)
    event_type = models.CharField(max_length=24, choices=_choices(EventType))
    action_id = models.CharField(max_length=32, blank=True, default="")
    count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notif_daily_stats"
        verbose_name = "آمار روزانه"
        verbose_name_plural = "آمار روزانه"
        constraints = [
            models.UniqueConstraint(
                fields=["date", "category_key", "event_type", "action_id"],
                name="notif_daily_stats_uniq",
            )
        ]
