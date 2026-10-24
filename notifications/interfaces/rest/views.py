"""View های REST ماژول نوتیف — نازک: ورودی → Command → Service → DTO."""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView, exception_handler as drf_handler
from rest_framework_simplejwt.authentication import JWTAuthentication

from ...application.commands import (
    ChannelToggle,
    RegisterDeviceCommand,
    TrackBatchCommand,
    TrackEvent,
    UpdatePreferencesCommand,
)
from ...container import get_container
from ...domain.entities import Device
from ...domain.enums import ChannelType, EventType, Platform, Priority
from ...domain.errors import InvalidNotification, NotificationError
from .authentication import DeviceSecretAuthentication
from .serializers import (
    DeviceRegisterSerializer,
    DeviceUnregisterSerializer,
    MarkReadSerializer,
    PreferencesUpdateSerializer,
    TestSendSerializer,
    TrackBatchSerializer,
)


def notify_exception_handler(exc, context):
    if isinstance(exc, NotificationError):
        return Response({"error": exc.to_dict()}, status=exc.http_status)
    return drf_handler(exc, context)


class BaseNotifyView(APIView):
    permission_classes = [IsAuthenticated]

    def get_exception_handler(self):
        return notify_exception_handler

    @property
    def c(self):
        return get_container()


def _parse_dt(value: str | None):
    if not value:
        return None
    from django.utils.dateparse import parse_datetime

    dt = parse_datetime(value.replace(" ", "+"))  # «+» در query string به فاصله تبدیل می‌شود
    if dt is None:
        raise InvalidNotification("تاریخ نامعتبر است.")
    return dt


class DeviceView(BaseNotifyView):
    def post(self, request):
        s = DeviceRegisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        device = self.c.device_service.register(
            RegisterDeviceCommand(
                user_id=request.user.id,
                platform=Platform(d["platform"]),
                token=d["token"],
                app_version=d["app_version"],
                locale=d["locale"],
                timezone=d["timezone"],
            )
        )
        return Response(
            {
                "device_id": str(device.id),
                "tracking_secret": device.tracking_secret,
                "platform": device.platform.value,
            },
            status=status.HTTP_201_CREATED,
        )

    def delete(self, request):
        s = DeviceUnregisterSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        self.c.device_service.unregister(request.user.id, s.validated_data["token"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class TrackEventsView(BaseNotifyView):
    authentication_classes = [JWTAuthentication, DeviceSecretAuthentication]

    def post(self, request):
        s = TrackBatchSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        device = request.auth if isinstance(request.auth, Device) else None
        events = tuple(
            TrackEvent(
                client_event_id=e["id"],
                type=EventType(e["type"]),
                occurred_at=e["occurred_at"],
                notification_id=e.get("notification_id"),
                local_source_key=e["local_source_key"],
                category=e["category"],
                action_id=e["action_id"],
                metadata=e["metadata"],
            )
            for e in s.validated_data["events"]
        )
        result = self.c.tracking_service.ingest(
            TrackBatchCommand(
                user_id=request.user.id, events=events, device_id=device.id if device else None
            )
        )
        return Response(
            {"accepted": result.accepted, "duplicates": result.duplicates, "rejected": result.rejected}
        )


class InboxView(BaseNotifyView):
    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            limit = 20
        data = self.c.inbox_service.list(
            request.user.id,
            before=_parse_dt(request.query_params.get("before")),
            limit=limit,
            unread_only=request.query_params.get("unread") in {"1", "true"},
        )
        return Response(data)


class InboxReadView(BaseNotifyView):
    def post(self, request):
        s = MarkReadSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        ids = None if s.validated_data["all"] else s.validated_data["ids"]
        updated = self.c.inbox_service.mark_read(request.user.id, ids)
        return Response({"updated": updated, "unread_count": self.c.inbox_service.unread_count(request.user.id)})


class UnreadCountView(BaseNotifyView):
    def get(self, request):
        return Response({"unread_count": self.c.inbox_service.unread_count(request.user.id)})


class PendingInAppView(BaseNotifyView):
    def get(self, request):
        return Response({"items": self.c.inbox_service.pending_in_app(request.user.id)})


class PreferencesView(BaseNotifyView):
    def get(self, request):
        return Response(self.c.preference_service.describe(request.user.id))

    def put(self, request):
        s = PreferencesUpdateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        muted_provided = "muted_until" in d
        cmd = UpdatePreferencesCommand(
            user_id=request.user.id,
            toggles=tuple(
                ChannelToggle(t["category"], ChannelType(t["channel"]), t["enabled"])
                for t in d.get("toggles", [])
            ),
            quiet_hours=d.get("quiet_hours"),
            quiet_hours_enabled=d.get("quiet_hours_enabled"),
            timezone=d.get("timezone"),
            muted_until=d.get("muted_until"),
            clear_mute=muted_provided and d.get("muted_until") is None,
        )
        return Response(self.c.preference_service.update(cmd))

    patch = put


class LocalScheduleView(BaseNotifyView):
    def get(self, request):
        return Response(
            self.c.local_schedule_service.sync(
                request.user.id, _parse_dt(request.query_params.get("since"))
            )
        )


class AdminTestSendView(BaseNotifyView):
    """ارسال تستی برای ادمین/QA؛ پیش‌فرض گیرنده خود ادمین است."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        from ...api import Notifier

        s = TestSendSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        result = Notifier.notify(
            recipients=[d.get("user_id") or request.user.id],
            category=d["category"],
            template=d.get("template") or None,
            context=d["context"],
            title=d.get("title") or None,
            body=d.get("body"),
            content=d["content"],
            priority=Priority(d["priority"]) if d.get("priority") else None,
            channels=d.get("channels") or None,
            deeplink=d.get("deeplink") or None,
        )
        return Response(
            {"created": [str(i) for i in result.created]}, status=status.HTTP_201_CREATED
        )
