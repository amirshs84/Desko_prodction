"""InMemoryStreamTransport — حامل استریم درون‌فرآیندی (dev/test).

رویدادهای هر کانال را در یک بافر نگه می‌دارد و به consumer اجازه می‌دهد از ابتدا
relay کند (replay). چون producer و consumer در همین فرآیند و اغلب در همین ترد
اجرا می‌شوند (حالت inline/eager)، این پیاده‌سازی ساده اما thread-safe کافی است.

محدودیت: فقط تک‌فرآیندی است؛ برای استقرار چندکارگره‌ی واقعی از
``RedisStreamTransport`` استفاده کنید.
"""
from __future__ import annotations

import threading
import time
from typing import Iterator

from ...application.ports.stream_transport import StreamEvent


class _Channel:
    def __init__(self) -> None:
        self.events: list[StreamEvent] = []
        self.closed = False
        self.cond = threading.Condition()


class InMemoryStreamTransport:
    def __init__(self) -> None:
        self._channels: dict[str, _Channel] = {}
        self._lock = threading.Lock()

    def _get(self, channel: str) -> _Channel:
        with self._lock:
            ch = self._channels.get(channel)
            if ch is None:
                ch = _Channel()
                self._channels[channel] = ch
            return ch

    def publish(self, channel: str, event: StreamEvent) -> None:
        ch = self._get(channel)
        with ch.cond:
            ch.events.append(event)
            if event.is_terminal:
                ch.closed = True
            ch.cond.notify_all()

    def subscribe(
        self, channel: str, *, timeout: float | None = None
    ) -> Iterator[StreamEvent]:
        ch = self._get(channel)
        deadline = None if timeout is None else time.monotonic() + timeout
        index = 0
        while True:
            with ch.cond:
                while index < len(ch.events):
                    event = ch.events[index]
                    index += 1
                    yield event
                    if event.is_terminal:
                        return
                if ch.closed:
                    return
                remaining = None
                if deadline is not None:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0:
                        return
                ch.cond.wait(timeout=remaining)
