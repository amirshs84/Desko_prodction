"""Task های Celery ماژول نوتیف؛ یک task به ازای هر صف تا routing ساده و شفاف بماند."""
from __future__ import annotations

import logging
import uuid

from celery import shared_task

from ..domain.errors import PushProviderError

logger = logging.getLogger(__name__)

RETRY_KWARGS = {"max_retries": 5}


def _dispatch(task, notification_id: str) -> str | None:
    from ..container import get_container

    final = task.request.retries >= task.max_retries
    try:
        status = get_container().dispatch_service.dispatch(
            uuid.UUID(notification_id), final_attempt=final
        )
    except PushProviderError as exc:
        # backoff نمایی: 10s, 20s, 40s, ...
        raise task.retry(exc=exc, countdown=10 * (2 ** task.request.retries))
    return status.value if status else None


@shared_task(bind=True, name="notifications.dispatch_critical", **RETRY_KWARGS)
def dispatch_critical(self, notification_id: str):
    return _dispatch(self, notification_id)


@shared_task(bind=True, name="notifications.dispatch_default", **RETRY_KWARGS)
def dispatch_default(self, notification_id: str):
    return _dispatch(self, notification_id)


@shared_task(bind=True, name="notifications.dispatch_bulk", **RETRY_KWARGS)
def dispatch_bulk(self, notification_id: str):
    return _dispatch(self, notification_id)


@shared_task(name="notifications.release_deferred")
def release_deferred():
    from ..container import get_container

    return get_container().dispatch_service.release_due()


@shared_task(name="notifications.aggregate_daily_stats")
def aggregate_daily_stats():
    from .stats import aggregate_recent

    return aggregate_recent()
