"""InProcessEventDispatcher — پیاده‌سازی EventPublisher به‌صورت درون‌فرایندی.

هر نوع رویداد می‌تواند چند handler داشته باشد (fan-out). انتشار هم‌زمان و درون
همان پروسه است.

چرا شروع با in-process؟ سادگی و سازگاری قوی؛ برای مقیاس فعلی کافی است. اگر
بعداً نیاز به انتشار بین‌سرویسی بود، همین Port با یک publisher مبتنی بر broker
(مثلاً از طریق Celery/Outbox) جایگزین می‌شود بدون تغییر در دامنه/سرویس.

نکته‌ی مقاومت: خطای یک handler نباید بقیه را متوقف کند یا تراکنش اصلی (که از قبل
commit شده) را بشکند؛ بنابراین خطاها لاگ می‌شوند نه پرتاب.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from typing import Callable

from ...shared.domain.events import DomainEvent

logger = logging.getLogger("ai.events")

EventHandler = Callable[[DomainEvent], None]


class InProcessEventDispatcher:
    def __init__(self) -> None:
        self._handlers: dict[type[DomainEvent], list[EventHandler]] = defaultdict(list)

    def register(self, event_type: type[DomainEvent], handler: EventHandler) -> None:
        self._handlers[event_type].append(handler)

    def publish(self, event: DomainEvent) -> None:
        for handler in self._handlers.get(type(event), []):
            try:
                handler(event)
            except Exception:  # noqa: BLE001 — عمداً ایزوله می‌کنیم
                logger.exception(
                    "handler رویداد %s با خطا مواجه شد", type(event).__name__
                )
