"""پل Server-Sent Events (SSE) برای استریم پاسخ دستیار.

رویدادهای framework-agnostic ``StreamEvent`` را به فریم‌های متنی SSE ترجمه و در
یک ``StreamingHttpResponse`` بسته‌بندی می‌کند.

چرا SSE و نه WebSocket؟ جریان تولید «یک‌طرفه» (سرور→کلاینت) است؛ SSE سبک‌تر،
سازگار با HTTP/2، دارای reconnect خودکار مرورگر، و بدون نیاز به هندشیک جداگانه
است. WebSocket برای تعامل دوطرفه (مثل tool-calling تعاملی) در آینده قابل افزودن
است.

نکته‌ی مهم درباره‌ی خطا: پس از شروع استریم، هدرهای HTTP ارسال شده‌اند و دیگر
نمی‌توان کد وضعیت را تغییر داد؛ بنابراین خطاها به‌صورت رویداد ``error`` داخل خودِ
استریم ارسال می‌شوند (نه پاسخ 4xx/5xx).
"""
from __future__ import annotations

import json
from typing import Iterable, Iterator

from django.http import StreamingHttpResponse

from ...application.services.generation_service import StreamEvent


def _format(event: StreamEvent) -> str:
    payload = json.dumps(event.data, ensure_ascii=False, separators=(",", ":"))
    return f"event: {event.event}\ndata: {payload}\n\n"


def _byte_stream(events: Iterable[StreamEvent]) -> Iterator[bytes]:
    # کامنت اولیه‌ی SSE؛ برخی proxyها تا اولین بایت بافر می‌کنند.
    yield b": stream-open\n\n"
    for event in events:
        yield _format(event).encode("utf-8")


def sse_response(events: Iterable[StreamEvent]) -> StreamingHttpResponse:
    response = StreamingHttpResponse(
        _byte_stream(events), content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"  # غیرفعال‌کردن بافر nginx
    return response
