"""CeleryGenerationQueue — زمان‌بندی تولید روی worker پس‌زمینه (prod).

``enqueue_generation`` صرفاً یک Celery task را dispatch می‌کند و بلافاصله
بازمی‌گردد؛ درخواست وب بلاک نمی‌شود (ظرفیت هم‌زمانی حفظ می‌شود). خودِ تولید و
انتشار رویدادها در worker انجام می‌شود.

context به dict تبدیل می‌شود تا از مرز serialization (broker) عبور کند. import
تسک به‌صورت lazy است تا وابستگی به celery فقط هنگام استفاده لازم شود.
"""
from __future__ import annotations

from uuid import UUID

from ...shared.application.context import RequestContext
from ..streaming import context_to_dict


class CeleryGenerationQueue:
    def __init__(self, *, queue: str = "ai_generation") -> None:
        self._queue = queue

    def enqueue_generation(
        self, *, message_id: UUID, context: RequestContext
    ) -> None:
        from ..celery_tasks import run_generation_task

        run_generation_task.apply_async(
            kwargs={
                "message_id": str(message_id),
                "context": context_to_dict(context),
            },
            queue=self._queue,
        )
