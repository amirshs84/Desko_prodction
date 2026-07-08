"""InlineGenerationQueue — اجرای همگام تولید (dev/test، بدون بروکر).

``enqueue_generation`` بلافاصله و در همان فرآیند تولید را اجرا و رویدادها را روی
حامل درون‌حافظه‌ای منتشر می‌کند. این حالت برای توسعه/تست است تا کل مسیر بدون
راه‌اندازی Redis/Celery کار کند.

هشدار: چون تولید همگام است، درخواستِ فراخواننده تا پایان تولید بلاک می‌شود؛ در
prod از ``CeleryGenerationQueue`` استفاده کنید.

runner از طریق یک provider (callable) تزریق می‌شود تا از وابستگی حلقوی با
Container در زمان ساخت پرهیز شود (runner خودش به سرویس‌های Container نیاز دارد).
"""
from __future__ import annotations

from typing import Callable
from uuid import UUID

from ...shared.application.context import RequestContext
from ..streaming import GenerationRunner


class InlineGenerationQueue:
    def __init__(self, runner_provider: Callable[[], GenerationRunner]) -> None:
        self._runner_provider = runner_provider

    def enqueue_generation(
        self, *, message_id: UUID, context: RequestContext
    ) -> None:
        self._runner_provider().run(message_id=message_id, ctx=context)
