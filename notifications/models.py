"""نقطه‌ی کشف مدل‌ها توسط Django؛ تعریف اصلی در ``infrastructure/persistence/models.py``."""
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

__all__ = [
    "CategoryModel",
    "DailyStatsModel",
    "DeliveryAttemptModel",
    "DeviceModel",
    "InteractionEventModel",
    "LocalReminderModel",
    "NotificationModel",
    "PreferenceModel",
    "TemplateModel",
]
