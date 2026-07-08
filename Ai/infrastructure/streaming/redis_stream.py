"""RedisStreamTransport — حامل استریم مبتنی بر Redis Streams (prod).

چرا Redis Streams و نه Pub/Sub؟ در Pub/Sub اگر consumer دیرتر از producer مشترک
شود، رویدادهای منتشرشده را از دست می‌دهد (fire-and-forget). Redis Streams تاریخچه
را با ID یکنواخت نگه می‌دارد؛ consumer می‌تواند از ابتدا (``0``) بخواند و هیچ
توکنی گم نشود — دقیقاً همان تضمینی که یک UX استریم صحیح لازم دارد.

هر کانال یک Stream مجزاست با ``MAXLEN`` تقریبی و TTL تا بعد از اتمام تولید پاک
شود (جلوگیری از رشد نامحدود حافظه‌ی Redis).

وابستگی ``redis`` به‌صورت lazy import می‌شود تا نبود آن در محیط dev (که از حامل
درون‌حافظه‌ای استفاده می‌کند) پروژه را نشکند.
"""
from __future__ import annotations

import json
from typing import Iterator

from ...application.ports.stream_transport import StreamEvent
from .serialization import event_from_dict, event_to_dict

_FIELD = "payload"


class RedisStreamTransport:
    def __init__(
        self,
        url: str,
        *,
        block_ms: int = 15000,
        max_len: int = 1000,
        ttl_seconds: int = 3600,
    ) -> None:
        import redis  # lazy: فقط وقتی این حامل واقعاً انتخاب شود

        self._redis = redis.Redis.from_url(url, decode_responses=True)
        self._block_ms = block_ms
        self._max_len = max_len
        self._ttl = ttl_seconds

    def publish(self, channel: str, event: StreamEvent) -> None:
        payload = json.dumps(event_to_dict(event), ensure_ascii=False)
        self._redis.xadd(
            channel, {_FIELD: payload}, maxlen=self._max_len, approximate=True
        )
        # پس از رویداد پایانی، انقضا می‌گذاریم تا Stream خودبه‌خود پاک شود.
        if event.is_terminal:
            self._redis.expire(channel, self._ttl)

    def subscribe(
        self, channel: str, *, timeout: float | None = None
    ) -> Iterator[StreamEvent]:
        last_id = "0"  # از ابتدای Stream (شامل رویدادهای منتشرشده پیش از اشتراک)
        deadline = None
        if timeout is not None:
            import time

            deadline = time.monotonic() + timeout
        while True:
            block = self._block_ms
            if deadline is not None:
                import time

                remaining_ms = int((deadline - time.monotonic()) * 1000)
                if remaining_ms <= 0:
                    return
                block = min(block, remaining_ms)
            result = self._redis.xread({channel: last_id}, block=block, count=50)
            if not result:
                if deadline is not None:
                    continue  # timeout هنوز نرسیده؛ دوباره block می‌کنیم
                return
            for _stream, entries in result:
                for entry_id, fields in entries:
                    last_id = entry_id
                    event = event_from_dict(json.loads(fields[_FIELD]))
                    yield event
                    if event.is_terminal:
                        return
