"""کانال‌های تحویل (Strategy + Registry).

افزودن کانال جدید (SMS، پوش ایرانی، ایمیل) = یک کلاس ``DeliveryChannel`` جدید و
ثبت آن در Container؛ هیچ کد موجودی تغییر نمی‌کند (Open/Closed).
"""
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from datetime import datetime

from ..domain.entities import DeliveryAttempt, Notification
from ..domain.enums import ChannelType, DeliveryStatus
from ..domain.errors import PushProviderError
from ..domain.repositories import DeviceRepository
from .dto import notification_to_dict
from .ports import PushGateway, RealtimeGateway


def _attempt(n: Notification, channel: ChannelType, status: DeliveryStatus, now: datetime, **kw):
    return DeliveryAttempt(
        id=uuid.uuid4(), notification_id=n.id, channel=channel, status=status, created_at=now, **kw
    )


class DeliveryChannel(ABC):
    type: ChannelType

    @abstractmethod
    def deliver(self, notification: Notification, now: datetime) -> list[DeliveryAttempt]:
        """باید برای خطای موقت ``PushProviderError(retryable=True)`` پرتاب کند."""


class PushChannel(DeliveryChannel):
    type = ChannelType.PUSH

    def __init__(self, devices: DeviceRepository, gateway: PushGateway) -> None:
        self._devices = devices
        self._gateway = gateway

    def deliver(self, notification: Notification, now: datetime) -> list[DeliveryAttempt]:
        devices = self._devices.active_for_user(notification.recipient_id)
        if not devices:
            return [_attempt(notification, self.type, DeliveryStatus.SKIPPED, now, error="no_device")]

        results = self._gateway.send(notification, devices)
        invalid = {d.token for d, r in zip(devices, results) if r.token_invalid}
        self._devices.deactivate_tokens(invalid)

        attempts = [
            _attempt(
                notification,
                self.type,
                DeliveryStatus.SENT if r.success else DeliveryStatus.FAILED,
                now,
                device_id=r.device_id,
                provider_message_id=r.message_id,
                error=r.error,
            )
            for r in results
        ]
        if not any(r.success for r in results) and any(r.retryable for r in results):
            raise PushProviderError("all push deliveries failed", retryable=True)
        return attempts


class RealtimeChannel(DeliveryChannel):
    type = ChannelType.REALTIME

    def __init__(self, gateway: RealtimeGateway) -> None:
        self._gateway = gateway

    def deliver(self, notification: Notification, now: datetime) -> list[DeliveryAttempt]:
        try:
            self._gateway.send_to_user(
                notification.recipient_id, "notification", notification_to_dict(notification)
            )
        except Exception as exc:  # noqa: BLE001 - realtime best-effort است؛ inbox منبع حقیقت است
            return [_attempt(notification, self.type, DeliveryStatus.FAILED, now, error=str(exc))]
        return [_attempt(notification, self.type, DeliveryStatus.SENT, now)]


class InAppChannel(DeliveryChannel):
    """مودال/انیمیشن داخل اپ: اگر کاربر آنلاین است فوری، وگرنه با ``in-app/pending`` هنگام باز شدن اپ."""

    type = ChannelType.IN_APP

    def __init__(self, gateway: RealtimeGateway) -> None:
        self._gateway = gateway

    def deliver(self, notification: Notification, now: datetime) -> list[DeliveryAttempt]:
        try:
            self._gateway.send_to_user(
                notification.recipient_id, "in_app", notification_to_dict(notification)
            )
        except Exception as exc:  # noqa: BLE001
            return [_attempt(notification, self.type, DeliveryStatus.FAILED, now, error=str(exc))]
        return [_attempt(notification, self.type, DeliveryStatus.SENT, now)]


class InboxChannel(DeliveryChannel):
    """رکورد نوتیف خودش صندوق است؛ این کانال فقط تحویل را ثبت می‌کند."""

    type = ChannelType.INBOX

    def deliver(self, notification: Notification, now: datetime) -> list[DeliveryAttempt]:
        return [_attempt(notification, self.type, DeliveryStatus.SENT, now)]


class ChannelRegistry:
    def __init__(self, channels: list[DeliveryChannel]) -> None:
        self._channels = {c.type: c for c in channels}

    def get(self, channel_type: ChannelType) -> DeliveryChannel | None:
        return self._channels.get(channel_type)

    def ordered(self, types: frozenset[ChannelType]) -> list[DeliveryChannel]:
        # INBOX/REALTIME قبل از PUSH: اگر push خطای retry داد، کانال‌های سریع تحویل شده‌اند.
        order = [ChannelType.INBOX, ChannelType.REALTIME, ChannelType.IN_APP, ChannelType.PUSH]
        rest = [t for t in types if t not in order]
        return [self._channels[t] for t in order + rest if t in types and t in self._channels]
