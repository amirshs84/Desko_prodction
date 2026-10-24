"""آداپتورهای سبک: ساعت، رندر قالب، rate limiter، realtime."""
from __future__ import annotations

import logging
import string
from typing import Any

from django.core.cache import cache
from django.utils import timezone

from ..application.ports import RateLimiter, RealtimeGateway, TemplateRenderer

logger = logging.getLogger(__name__)


class SystemClock:
    def now(self):
        return timezone.now()


class _SafeDict(dict):
    def __missing__(self, key: str) -> str:
        return "{" + key + "}"


class _SafeFormatter(string.Formatter):
    """فقط جایگذاری نام ساده؛ دسترسی به attribute/index (``{x.__class__}``) ممنوع است."""

    def get_field(self, field_name, args, kwargs):
        if not field_name.isidentifier():
            return "{" + field_name + "}", field_name
        return super().get_field(field_name, args, kwargs)

    def format_field(self, value, format_spec):
        return super().format_field(value, "")


class SafeTemplateRenderer(TemplateRenderer):
    _formatter = _SafeFormatter()

    def render(self, text: str, context: dict[str, Any]) -> str:
        try:
            return self._formatter.vformat(text, (), _SafeDict(context))
        except (ValueError, IndexError, KeyError):
            return text


class CacheRateLimiter(RateLimiter):
    """شمارنده‌ی پنجره‌ی ثابت روی Django cache (در prod = Redis و اتمیک)."""

    def acquire(self, key: str, limit: int, window_seconds: int) -> bool:
        cache.add(key, 0, timeout=window_seconds)
        try:
            count = cache.incr(key)
        except ValueError:  # کلید بین add و incr منقضی شد
            cache.set(key, 1, timeout=window_seconds)
            count = 1
        return count <= limit


class ChannelsRealtimeGateway(RealtimeGateway):
    def send_to_user(self, user_id: int, event: str, payload: dict[str, Any]) -> None:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        layer = get_channel_layer()
        if layer is None:
            return
        async_to_sync(layer.group_send)(
            f"user_{user_id}",
            {"type": "notification.message", "event": event, "payload": payload},
        )
