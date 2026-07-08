"""NullGenerationQueue — پیاده‌سازی موقت GenerationQueue.

فقط درخواست تولید را لاگ می‌کند و کاری انجام نمی‌دهد. هدف این است که Composition
Root کامل و قابل‌اجرا بماند پیش از افزودن Celery. در «لایه ۱۶: Celery Tasks» با
پیاده‌سازی واقعی (که task را enqueue می‌کند) جایگزین می‌شود — بدون تغییر در
Service ها (به‌لطف Port).
"""
from __future__ import annotations

import logging
from uuid import UUID

from ...shared.application.context import RequestContext

logger = logging.getLogger("ai.queue")


class NullGenerationQueue:
    def enqueue_generation(
        self, *, message_id: UUID, context: RequestContext
    ) -> None:
        logger.info(
            "درخواست تولید برای پیام %s (tenant=%s) دریافت شد (NullQueue)",
            message_id,
            context.tenant_id,
        )
