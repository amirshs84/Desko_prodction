"""پیاده‌سازی Django ِ port های persistence."""
from __future__ import annotations

import uuid
from collections.abc import Iterable
from datetime import datetime, timedelta

from django.db.models import Q

from ...domain.entities import (
    DeliveryAttempt,
    Device,
    InteractionEvent,
    LocalReminder,
    Notification,
    NotificationCategory,
    NotificationTemplate,
    UserPreference,
)
from ...domain.enums import NotificationStatus, Platform
from ...domain.repositories import (
    CategoryRepository,
    DeliveryAttemptRepository,
    DeviceRepository,
    InteractionEventRepository,
    LocalReminderRepository,
    NotificationRepository,
    PreferenceRepository,
    TemplateRepository,
)
from . import mappers
from .models import (
    CategoryModel,
    DeliveryAttemptModel,
    DeviceModel,
    InteractionEventModel,
    LocalReminderModel,
    NotificationModel,
    PreferenceModel,
    TemplateModel,
)

DEFAULT_LOCALE = "fa"


class DjangoNotificationRepository(NotificationRepository):
    def add(self, notification: Notification) -> None:
        NotificationModel.objects.create(id=notification.id, **mappers.notification_fields(notification))

    def save(self, notification: Notification) -> None:
        NotificationModel.objects.filter(id=notification.id).update(
            **mappers.notification_fields(notification)
        )

    def get(self, notification_id: uuid.UUID) -> Notification | None:
        m = NotificationModel.objects.filter(id=notification_id).first()
        return mappers.notification_to_entity(m) if m else None

    def find_by_idempotency_key(self, recipient_id: int, key: str) -> Notification | None:
        m = NotificationModel.objects.filter(recipient_id=recipient_id, idempotency_key=key).first()
        return mappers.notification_to_entity(m) if m else None

    def find_recent_by_collapse_key(
        self, recipient_id: int, collapse_key: str, since: datetime, exclude_id: uuid.UUID
    ) -> Notification | None:
        m = (
            NotificationModel.objects.filter(
                recipient_id=recipient_id,
                collapse_key=collapse_key,
                created_at__gte=since,
                status=NotificationStatus.DISPATCHED.value,
            )
            .exclude(id=exclude_id)
            .order_by("-created_at")
            .first()
        )
        return mappers.notification_to_entity(m) if m else None

    def claim_for_dispatch(self, notification_id: uuid.UUID, now: datetime) -> bool:
        claimable = [
            NotificationStatus.PENDING.value,
            NotificationStatus.DEFERRED.value,
            NotificationStatus.FAILED.value,
        ]
        updated = (
            NotificationModel.objects.filter(id=notification_id, status__in=claimable)
            .filter(Q(scheduled_at__isnull=True) | Q(scheduled_at__lte=now))
            .update(status=NotificationStatus.DISPATCHING.value, claimed_at=now)
        )
        return updated == 1

    def due_deferred(self, now: datetime, limit: int) -> list[Notification]:
        # PENDING بدون زمان‌بندی که ۱۰ دقیقه مانده یعنی پیام صف گم شده (مثلا broker ریستارت شده)
        lost = Q(scheduled_at__isnull=True, created_at__lt=now - timedelta(minutes=10))
        qs = NotificationModel.objects.filter(
            Q(scheduled_at__lte=now) | lost,
            status__in=[NotificationStatus.DEFERRED.value, NotificationStatus.PENDING.value],
        ).order_by("created_at")[:limit]
        return [mappers.notification_to_entity(m) for m in qs]

    def requeue_stale(self, stuck_before: datetime) -> list[Notification]:
        qs = NotificationModel.objects.filter(
            status=NotificationStatus.DISPATCHING.value, claimed_at__lt=stuck_before
        )
        ids = list(qs.values_list("id", flat=True)[:500])
        NotificationModel.objects.filter(id__in=ids).update(status=NotificationStatus.FAILED.value)
        return [
            mappers.notification_to_entity(m) for m in NotificationModel.objects.filter(id__in=ids)
        ]

    def pending_in_app(self, recipient_id: int, since: datetime, limit: int) -> list[Notification]:
        qs = NotificationModel.objects.filter(
            recipient_id=recipient_id,
            status=NotificationStatus.DISPATCHED.value,
            in_app=True,
            read_at__isnull=True,
            created_at__gte=since,
        ).order_by("-created_at")[:limit]
        return [mappers.notification_to_entity(m) for m in qs]

    def list_inbox(
        self, recipient_id: int, *, before: datetime | None, limit: int, unread_only: bool
    ) -> list[Notification]:
        qs = self._inbox_qs(recipient_id)
        if before:
            qs = qs.filter(created_at__lt=before)
        if unread_only:
            qs = qs.filter(read_at__isnull=True)
        return [mappers.notification_to_entity(m) for m in qs.order_by("-created_at")[:limit]]

    def unread_count(self, recipient_id: int) -> int:
        return self._inbox_qs(recipient_id).filter(read_at__isnull=True).count()

    def mark_read(self, recipient_id: int, ids: Iterable[uuid.UUID] | None, now: datetime) -> int:
        qs = NotificationModel.objects.filter(recipient_id=recipient_id, read_at__isnull=True)
        if ids is not None:
            qs = qs.filter(id__in=list(ids))
        return qs.update(read_at=now)

    @staticmethod
    def _inbox_qs(recipient_id: int):
        return NotificationModel.objects.filter(
            recipient_id=recipient_id,
            in_inbox=True,
            status=NotificationStatus.DISPATCHED.value,
        )


class DjangoDeviceRepository(DeviceRepository):
    def get(self, device_id: uuid.UUID) -> Device | None:
        m = DeviceModel.objects.filter(id=device_id).first()
        return mappers.device_to_entity(m) if m else None

    def get_by_token(self, token: str) -> Device | None:
        m = DeviceModel.objects.filter(token=token).first()
        return mappers.device_to_entity(m) if m else None

    def save(self, device: Device) -> None:
        DeviceModel.objects.update_or_create(id=device.id, defaults=mappers.device_fields(device))

    def active_for_user(self, user_id: int, platforms: set[Platform] | None = None) -> list[Device]:
        qs = DeviceModel.objects.filter(user_id=user_id, is_active=True)
        if platforms:
            qs = qs.filter(platform__in=[p.value for p in platforms])
        return [mappers.device_to_entity(m) for m in qs]

    def deactivate_tokens(self, tokens: Iterable[str]) -> int:
        tokens = list(tokens)
        if not tokens:
            return 0
        return DeviceModel.objects.filter(token__in=tokens).update(is_active=False)


class DjangoCategoryRepository(CategoryRepository):
    def get(self, key: str) -> NotificationCategory | None:
        m = CategoryModel.objects.filter(key=key).first()
        return mappers.category_to_entity(m) if m else None

    def list_active(self) -> list[NotificationCategory]:
        return [mappers.category_to_entity(m) for m in CategoryModel.objects.filter(is_active=True)]


class DjangoTemplateRepository(TemplateRepository):
    def get(self, key: str, locale: str) -> NotificationTemplate | None:
        rows = {
            m.locale: m
            for m in TemplateModel.objects.filter(
                key=key, is_active=True, locale__in={locale, DEFAULT_LOCALE}
            )
        }
        m = rows.get(locale) or rows.get(DEFAULT_LOCALE)
        return mappers.template_to_entity(m) if m else None


class DjangoPreferenceRepository(PreferenceRepository):
    def get(self, user_id: int) -> UserPreference | None:
        m = PreferenceModel.objects.filter(user_id=user_id).first()
        return mappers.preference_to_entity(m) if m else None

    def save(self, preference: UserPreference) -> None:
        PreferenceModel.objects.update_or_create(
            user_id=preference.user_id, defaults=mappers.preference_fields(preference)
        )


class DjangoDeliveryAttemptRepository(DeliveryAttemptRepository):
    def add_many(self, attempts: list[DeliveryAttempt]) -> None:
        DeliveryAttemptModel.objects.bulk_create(
            [
                DeliveryAttemptModel(
                    id=a.id,
                    notification_id=a.notification_id,
                    channel=a.channel.value,
                    device_id=a.device_id,
                    status=a.status.value,
                    provider_message_id=a.provider_message_id,
                    error=a.error[:2000],
                    created_at=a.created_at,
                )
                for a in attempts
            ]
        )


class DjangoInteractionEventRepository(InteractionEventRepository):
    def add_many(self, events: list[InteractionEvent]) -> int:
        if not events:
            return 0
        ids = [e.client_event_id for e in events]
        existing = set(
            InteractionEventModel.objects.filter(client_event_id__in=ids).values_list(
                "client_event_id", flat=True
            )
        )
        fresh = {e.client_event_id: e for e in events if e.client_event_id not in existing}
        # ignore_conflicts برای رقابت هم‌زمان دو flush از یک دستگاه
        InteractionEventModel.objects.bulk_create(
            [
                InteractionEventModel(
                    client_event_id=e.client_event_id,
                    type=e.type.value,
                    source=e.source.value,
                    user_id=e.user_id,
                    notification_id=e.notification_id,
                    device_id=e.device_id,
                    category_key=e.category_key,
                    action_id=e.action_id,
                    metadata=e.metadata,
                    occurred_at=e.occurred_at,
                )
                for e in fresh.values()
            ],
            ignore_conflicts=True,
        )
        return len(fresh)


class DjangoLocalReminderRepository(LocalReminderRepository):
    def upsert(self, reminder: LocalReminder) -> LocalReminder:
        fields = {
            "category_key": reminder.category_key,
            "priority": reminder.priority.value,
            "fire_at": reminder.fire_at,
            "content": reminder.content.to_dict(),
            "deeplink": reminder.deeplink or "",
            "cancelled": reminder.cancelled,
            "updated_at": reminder.updated_at,
        }
        m, _ = LocalReminderModel.objects.update_or_create(
            user_id=reminder.user_id,
            source_key=reminder.source_key,
            defaults=fields,
            create_defaults={**fields, "id": reminder.id},
        )
        return mappers.reminder_to_entity(m)

    def cancel(self, user_id: int, source_key: str, now: datetime) -> bool:
        return bool(
            LocalReminderModel.objects.filter(
                user_id=user_id, source_key=source_key, cancelled=False
            ).update(cancelled=True, updated_at=now)
        )

    def changed_since(
        self, user_id: int, since: datetime | None, horizon: datetime
    ) -> list[LocalReminder]:
        qs = LocalReminderModel.objects.filter(user_id=user_id, fire_at__lte=horizon)
        if since:
            qs = qs.filter(updated_at__gt=since)
        else:
            qs = qs.filter(Q(cancelled=False))
        return [mappers.reminder_to_entity(m) for m in qs.order_by("fire_at")]

    def list_active_by_prefix(
        self, user_id: int, prefix: str, after: datetime
    ) -> list[LocalReminder]:
        qs = LocalReminderModel.objects.filter(
            user_id=user_id, source_key__startswith=prefix, cancelled=False, fire_at__gt=after
        )
        return [mappers.reminder_to_entity(m) for m in qs]
