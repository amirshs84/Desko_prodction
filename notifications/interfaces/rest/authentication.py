"""احراز با secret دستگاه برای ارسال رویداد از سرویس native (WorkManager) که JWT ندارد.

هدرها: ``X-Device-Id`` و ``X-Device-Secret`` (از پاسخ ثبت دستگاه).
دامنه‌ی این اعتبار فقط ``events/batch/`` است.
"""
from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

from ...container import get_container


class DeviceSecretAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        device_id = request.headers.get("X-Device-Id")
        secret = request.headers.get("X-Device-Secret")
        if not device_id or not secret:
            return None
        try:
            device_uuid = uuid.UUID(device_id)
        except ValueError as exc:
            raise exceptions.AuthenticationFailed("invalid device id") from exc
        device = get_container().device_service.authenticate_tracking(device_uuid, secret)
        if device is None:
            raise exceptions.AuthenticationFailed("invalid device credentials")
        user = get_user_model().objects.filter(id=device.user_id, is_active=True).first()
        if user is None:
            raise exceptions.AuthenticationFailed("inactive user")
        return user, device

    def authenticate_header(self, request):
        return "Device"
