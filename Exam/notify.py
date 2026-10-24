"""ارسال نوتیف شروع جلسه آزمون — تنها وابستگی Exam به ماژول notifications."""
from __future__ import annotations

import logging
from collections.abc import Iterable

from django.utils import timezone

from .models import SessionRecord

logger = logging.getLogger(__name__)


def notify_exam_session_started(session: SessionRecord, user_ids: Iterable[int]) -> None:
    """وقتی دانش‌آموز به جلسه اضافه می‌شود: CRITICAL، سر ``start_time`` (یا فوری اگر شروع شده)."""
    from notifications.api import Notifier, Priority

    now = timezone.now()
    start = session.start_time
    scheduled_at = start if start and start > now else None
    exam_title = getattr(getattr(session, "exam", None), "title", None) or session.title
    for user_id in dict.fromkeys(int(uid) for uid in user_ids):
        try:
            Notifier.notify_safely(
                recipients=[user_id],
                category="exam",
                template="exam_session_started",
                context={"exam_title": exam_title},
                priority=Priority.CRITICAL,
                deeplink=f"/exams/{session.id}/take",
                collapse_key=f"exam:{session.id}",
                idempotency_key=f"exam-start:{session.id}:{user_id}",
                scheduled_at=scheduled_at,
                expires_at=session.end_time,
            )
        except Exception:  # noqa: BLE001 — نوتیف هرگز افزودن شرکت‌کننده را نمی‌شکند
            logger.exception(
                "exam start notify failed: session=%s user=%s", session.id, user_id
            )
