"""Celery tasks اپ Ai (worker پس‌زمینه — لایه ۱۶).

این ماژول تنها جایی است که celery وارد می‌شود و فقط زمانی import می‌شود که حالت
اجرا ``celery`` باشد (توسط ``CeleryGenerationQueue``) یا worker آن را autodiscover
کند. هر task یک «wrapper نازک» است: context را deserialize می‌کند و کار اصلی را
به سرویس‌های Container (framework-agnostic) واگذار می‌کند — منطق کسب‌وکار هرگز در
task زندگی نمی‌کند.

نکات پایداری:
  - ``acks_late`` + ``reject_on_worker_lost`` تا در صورت کرش worker، task دوباره
    اجرا شود (تولید ما با گذارهای وضعیت idempotent است).
  - خطاها لاگ می‌شوند؛ runner خودش رویداد ``error`` را روی حامل منتشر می‌کند تا
    consumerِ SSE بلاک نماند.
"""
from __future__ import annotations

import logging
from uuid import UUID

from celery import shared_task

logger = logging.getLogger("ai.tasks")


@shared_task(
    name="ai.run_generation",
    acks_late=True,
    reject_on_worker_lost=True,
    max_retries=0,
)
def run_generation_task(*, message_id: str, context: dict) -> None:
    """تولید پاسخ دستیار و انتشار رویدادها روی حامل استریم."""
    from ..container import get_container
    from .streaming import context_from_dict

    container = get_container()
    ctx = context_from_dict(context)
    container.generation_runner.run(message_id=UUID(message_id), ctx=ctx)


@shared_task(
    name="ai.ingest_attachment",
    acks_late=True,
    reject_on_worker_lost=True,
    max_retries=0,
)
def ingest_attachment_task(*, attachment_id: str, context: dict) -> None:
    """استخراج متن + chunk + embed پیوست (pipeline RAG) در پس‌زمینه."""
    from ..container import get_container
    from .streaming import context_from_dict

    container = get_container()
    ctx = context_from_dict(context)
    container.attachment_ingestion_service.ingest(UUID(attachment_id), ctx)
