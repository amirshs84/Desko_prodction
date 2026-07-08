"""Queue adapters — پیاده‌سازی‌های GenerationQueue.

- NullGenerationQueue   : بدون عملیات (placeholder اولیه).
- InlineGenerationQueue : اجرای همگام درون‌فرآیندی (dev/test، بدون بروکر).
- CeleryGenerationQueue : زمان‌بندی روی Celery worker (prod).
"""
from .celery_queue import CeleryGenerationQueue
from .inline_queue import InlineGenerationQueue
from .null_queue import NullGenerationQueue

__all__ = [
    "CeleryGenerationQueue",
    "InlineGenerationQueue",
    "NullGenerationQueue",
]
