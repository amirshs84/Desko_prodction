from django.contrib import admin

from .infrastructure.persistence.models import (
    CategoryModel,
    DailyStatsModel,
    DeliveryAttemptModel,
    DeviceModel,
    InteractionEventModel,
    LocalReminderModel,
    NotificationModel,
    PreferenceModel,
    TemplateModel,
)


@admin.register(CategoryModel)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("key", "title", "default_priority", "user_configurable", "is_active")
    list_filter = ("default_priority", "is_active")


@admin.register(TemplateModel)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ("key", "locale", "category", "priority", "is_active", "updated_at")
    list_filter = ("category", "locale", "is_active")
    search_fields = ("key", "title")


class DeliveryAttemptInline(admin.TabularInline):
    model = DeliveryAttemptModel
    extra = 0
    can_delete = False
    readonly_fields = ("channel", "device", "status", "provider_message_id", "error", "created_at")


@admin.register(NotificationModel)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "category", "priority", "status", "created_at", "read_at")
    list_filter = ("status", "priority", "category")
    search_fields = ("recipient__username", "idempotency_key", "collapse_key")
    raw_id_fields = ("recipient",)
    readonly_fields = [f.name for f in NotificationModel._meta.fields]
    inlines = [DeliveryAttemptInline]
    date_hierarchy = "created_at"


@admin.register(DeviceModel)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "platform", "app_version", "is_active", "last_seen_at")
    list_filter = ("platform", "is_active")
    search_fields = ("user__username", "token")
    raw_id_fields = ("user",)
    exclude = ("tracking_secret",)


@admin.register(PreferenceModel)
class PreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "quiet_hours", "quiet_hours_enabled", "muted_until", "updated_at")
    raw_id_fields = ("user",)


@admin.register(InteractionEventModel)
class InteractionEventAdmin(admin.ModelAdmin):
    list_display = ("type", "source", "user", "category_key", "action_id", "occurred_at")
    list_filter = ("type", "source", "category_key")
    raw_id_fields = ("user",)
    date_hierarchy = "occurred_at"

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(LocalReminderModel)
class LocalReminderAdmin(admin.ModelAdmin):
    list_display = ("user", "source_key", "category_key", "fire_at", "cancelled", "updated_at")
    list_filter = ("category_key", "cancelled")
    raw_id_fields = ("user",)


@admin.register(DailyStatsModel)
class DailyStatsAdmin(admin.ModelAdmin):
    list_display = ("date", "category_key", "event_type", "action_id", "count")
    list_filter = ("category_key", "event_type")
    date_hierarchy = "date"
