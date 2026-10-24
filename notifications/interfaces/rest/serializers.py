from __future__ import annotations

from rest_framework import serializers

from ...domain.enums import ChannelType, EventType, Platform, Priority


class DeviceRegisterSerializer(serializers.Serializer):
    platform = serializers.ChoiceField(choices=Platform.values())
    token = serializers.CharField(max_length=512)
    app_version = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    locale = serializers.CharField(max_length=8, required=False, default="fa")
    timezone = serializers.CharField(max_length=64, required=False, default="Asia/Tehran")


class DeviceUnregisterSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=512)


class TrackEventSerializer(serializers.Serializer):
    id = serializers.UUIDField(help_text="شناسه‌ی یکتای رویداد که کلاینت می‌سازد (idempotency)")
    type = serializers.ChoiceField(choices=sorted(e.value for e in EventType.client_reportable()))
    occurred_at = serializers.DateTimeField()
    notification_id = serializers.UUIDField(required=False, allow_null=True)
    local_source_key = serializers.CharField(max_length=128, required=False, allow_blank=True, default="")
    category = serializers.CharField(max_length=64, required=False, allow_blank=True, default="")
    action_id = serializers.CharField(max_length=32, required=False, allow_blank=True, default="")
    metadata = serializers.DictField(required=False, default=dict)


class TrackBatchSerializer(serializers.Serializer):
    events = TrackEventSerializer(many=True, allow_empty=False, max_length=100)


class MarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.UUIDField(), required=False, max_length=200)
    all = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if not attrs.get("all") and not attrs.get("ids"):
            raise serializers.ValidationError("ids یا all=true لازم است.")
        return attrs


class ChannelToggleSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=64)
    channel = serializers.ChoiceField(choices=ChannelType.values())
    enabled = serializers.BooleanField()


class PreferencesUpdateSerializer(serializers.Serializer):
    toggles = ChannelToggleSerializer(many=True, required=False, default=list)
    quiet_hours = serializers.CharField(max_length=11, required=False, allow_blank=True)
    quiet_hours_enabled = serializers.BooleanField(required=False)
    timezone = serializers.CharField(max_length=64, required=False)
    muted_until = serializers.DateTimeField(required=False, allow_null=True)


class TestSendSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=False)
    category = serializers.CharField(max_length=64, default="system")
    template = serializers.CharField(max_length=64, required=False, allow_blank=True)
    context = serializers.DictField(required=False, default=dict)
    title = serializers.CharField(max_length=120, required=False, allow_blank=True)
    body = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    content = serializers.DictField(required=False, default=dict)
    priority = serializers.ChoiceField(choices=Priority.values(), required=False)
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=ChannelType.values()), required=False
    )
    deeplink = serializers.CharField(max_length=500, required=False, allow_blank=True)
