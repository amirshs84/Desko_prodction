"""Composition Root ماژول نوتیفیکیشن — تنها جایی که پیاده‌سازی‌های concrete ساخته می‌شوند.

در تست می‌توان ``Container`` ساخت و هر وابستگی (مثلا push_gateway) را override کرد.
"""
from __future__ import annotations

from functools import cached_property

from .application.channels import (
    ChannelRegistry,
    InAppChannel,
    InboxChannel,
    PushChannel,
    RealtimeChannel,
)
from .application.content_factory import ContentFactory
from .application.pipeline import (
    DedupeStage,
    ExpiryStage,
    FrequencyCapStage,
    NotificationPipeline,
    PreferenceStage,
    QuietHoursStage,
)
from .application.services import (
    DeviceService,
    DispatchService,
    InboxService,
    LocalScheduleService,
    NotifyService,
    PreferenceService,
    TrackingService,
)
from .infrastructure.adapters import (
    CacheRateLimiter,
    ChannelsRealtimeGateway,
    SafeTemplateRenderer,
    SystemClock,
)
from .infrastructure.config import load_config
from .infrastructure.fcm import FcmPushGateway, LoggingPushGateway, default_builders
from .infrastructure.persistence.repositories import (
    DjangoCategoryRepository,
    DjangoDeliveryAttemptRepository,
    DjangoDeviceRepository,
    DjangoInteractionEventRepository,
    DjangoLocalReminderRepository,
    DjangoNotificationRepository,
    DjangoPreferenceRepository,
    DjangoTemplateRepository,
)
from .infrastructure.queue import CeleryNotificationQueue, InlineNotificationQueue
from .infrastructure.unit_of_work import DjangoUnitOfWork


class Container:
    def __init__(self) -> None:
        self.config = load_config()

    # ---------- زیرساخت پایه ----------

    @cached_property
    def clock(self) -> SystemClock:
        return SystemClock()

    def unit_of_work(self) -> DjangoUnitOfWork:
        return DjangoUnitOfWork()

    @cached_property
    def rate_limiter(self) -> CacheRateLimiter:
        return CacheRateLimiter()

    @cached_property
    def renderer(self) -> SafeTemplateRenderer:
        return SafeTemplateRenderer()

    @cached_property
    def realtime_gateway(self) -> ChannelsRealtimeGateway:
        return ChannelsRealtimeGateway()

    @cached_property
    def payload_builders(self) -> dict:
        return default_builders(self.config.web_link_base)

    @cached_property
    def push_gateway(self):
        if self.config.firebase_credentials:
            return FcmPushGateway(
                credentials=self.config.firebase_credentials,
                builders=self.payload_builders,
                clock=self.clock.now,
            )
        return LoggingPushGateway(self.payload_builders, self.clock.now)

    @cached_property
    def queue(self):
        if self.config.delivery_mode == "celery":
            return CeleryNotificationQueue()
        return InlineNotificationQueue(lambda: self.dispatch_service.dispatch)

    # ---------- Repository ها ----------

    @cached_property
    def notification_repo(self) -> DjangoNotificationRepository:
        return DjangoNotificationRepository()

    @cached_property
    def device_repo(self) -> DjangoDeviceRepository:
        return DjangoDeviceRepository()

    @cached_property
    def category_repo(self) -> DjangoCategoryRepository:
        return DjangoCategoryRepository()

    @cached_property
    def template_repo(self) -> DjangoTemplateRepository:
        return DjangoTemplateRepository()

    @cached_property
    def preference_repo(self) -> DjangoPreferenceRepository:
        return DjangoPreferenceRepository()

    @cached_property
    def attempt_repo(self) -> DjangoDeliveryAttemptRepository:
        return DjangoDeliveryAttemptRepository()

    @cached_property
    def event_repo(self) -> DjangoInteractionEventRepository:
        return DjangoInteractionEventRepository()

    @cached_property
    def reminder_repo(self) -> DjangoLocalReminderRepository:
        return DjangoLocalReminderRepository()

    # ---------- Pipeline و کانال‌ها ----------

    @cached_property
    def pipeline(self) -> NotificationPipeline:
        return NotificationPipeline(
            [
                ExpiryStage(),
                PreferenceStage(),
                QuietHoursStage(),
                DedupeStage(self.rate_limiter, self.config.dedupe_window_seconds),
                FrequencyCapStage(self.rate_limiter, self.config.daily_caps),
            ]
        )

    @cached_property
    def channel_registry(self) -> ChannelRegistry:
        return ChannelRegistry(
            [
                InboxChannel(),
                RealtimeChannel(self.realtime_gateway),
                InAppChannel(self.realtime_gateway),
                PushChannel(self.device_repo, self.push_gateway),
            ]
        )

    @cached_property
    def content_factory(self) -> ContentFactory:
        return ContentFactory(self.template_repo, self.renderer)

    # ---------- Service ها ----------

    @cached_property
    def preference_service(self) -> PreferenceService:
        return PreferenceService(
            preferences=self.preference_repo,
            categories=self.category_repo,
            default_quiet_hours=self.config.default_quiet_hours,
        )

    @cached_property
    def notify_service(self) -> NotifyService:
        return NotifyService(
            notifications=self.notification_repo,
            categories=self.category_repo,
            events=self.event_repo,
            content_factory=self.content_factory,
            queue=self.queue,
            clock=self.clock,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def dispatch_service(self) -> DispatchService:
        return DispatchService(
            notifications=self.notification_repo,
            categories=self.category_repo,
            preferences=self.preference_repo,
            attempts=self.attempt_repo,
            events=self.event_repo,
            pipeline=self.pipeline,
            channels=self.channel_registry,
            queue=self.queue,
            clock=self.clock,
            uow_factory=self.unit_of_work,
            default_preference=self.preference_service.default_for,
        )

    @cached_property
    def tracking_service(self) -> TrackingService:
        return TrackingService(
            events=self.event_repo,
            notifications=self.notification_repo,
            clock=self.clock,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def device_service(self) -> DeviceService:
        return DeviceService(devices=self.device_repo, clock=self.clock)

    @cached_property
    def inbox_service(self) -> InboxService:
        return InboxService(notifications=self.notification_repo, clock=self.clock)

    @cached_property
    def local_schedule_service(self) -> LocalScheduleService:
        return LocalScheduleService(
            reminders=self.reminder_repo,
            categories=self.category_repo,
            content_factory=self.content_factory,
            preferences=self.preference_service,
            clock=self.clock,
        )


_container: Container | None = None


def get_container() -> Container:
    global _container
    if _container is None:
        _container = Container()
    return _container


def set_container(container: Container | None) -> None:
    """برای تست: جایگزینی یا reset کردن container سراسری."""
    global _container
    _container = container
