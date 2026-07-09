"""Celery autodiscover — taskهای AI برای worker.

``autodiscover_tasks()`` فقط ماژول ``<app>.tasks`` را می‌خواند؛ تعریف واقعی
taskها در ``infrastructure/celery_tasks.py`` است و از اینجا re-export می‌شود.
"""
from __future__ import annotations

from .infrastructure.celery_tasks import (  # noqa: F401
    ingest_attachment_task,
    run_generation_task,
)

__all__ = ["ingest_attachment_task", "run_generation_task"]
