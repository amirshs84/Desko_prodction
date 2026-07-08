"""Port: StreamTransport — حامل رویدادهای استریم میان producer و consumer.

معماری استریم (لایه ۱۵/۱۶):
    producer (worker تولید) رویدادها را روی یک «کانال» منتشر می‌کند؛ consumer
    (اندپوینت SSE) به همان کانال مشترک می‌شود و رویدادها را relay می‌کند. این
    تفکیک اجازه می‌دهد تولید در فرآیند/ماشین دیگری (Celery worker) اجرا شود و
    درخواست وب فقط نقش relay داشته باشد.

قرارداد مستقل از پیاده‌سازی است: dev با یک صف درون‌حافظه‌ای کار می‌کند و prod با
Redis Streams (که تاریخچه را نگه می‌دارد تا consumerِ دیرتر‌رسیده رویدادها را از
دست ندهد).

``StreamEvent`` اینجا (در لایه‌ی port) تعریف شده تا «زبان مشترک» تولیدکننده و
حامل و مصرف‌کننده باشد و هیچ‌کدام به دیگری وابسته نشوند.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterator, Protocol


@dataclass(frozen=True)
class StreamEvent:
    """رویداد استریم مستقل از فریمورک؛ لایه‌ی interface آن را به SSE ترجمه می‌کند.

    انواع:
      - ``token`` : یک delta متنی (data={"delta": "..."})
      - ``done``  : پایان موفق (data={"message_id", "usage": {...}})
      - ``error`` : خطا (data={"code", "message"})
    """

    event: str
    data: dict = field(default_factory=dict)

    @property
    def is_terminal(self) -> bool:
        return self.event in ("done", "error")


class StreamTransport(Protocol):
    def publish(self, channel: str, event: StreamEvent) -> None:
        """انتشار یک رویداد روی کانال (و در رویداد پایانی، بستن کانال)."""
        ...

    def subscribe(
        self, channel: str, *, timeout: float | None = None
    ) -> Iterator[StreamEvent]:
        """اشتراک به کانال؛ رویدادها را از ابتدا relay می‌کند تا رسیدن به رویداد
        پایانی (done/error) یا اتمام ``timeout``.
        """
        ...
