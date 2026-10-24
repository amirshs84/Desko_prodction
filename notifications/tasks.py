"""نقطه‌ی کشف task ها توسط ``app.autodiscover_tasks()``؛ تعریف در infrastructure/celery_tasks.py."""
from .infrastructure.celery_tasks import (  # noqa: F401
    aggregate_daily_stats,
    dispatch_bulk,
    dispatch_critical,
    dispatch_default,
    release_deferred,
)
