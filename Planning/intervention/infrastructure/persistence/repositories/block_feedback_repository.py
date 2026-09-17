"""پیاده‌سازی Django مخزن بازخورد بلوک."""
from __future__ import annotations

from typing import Sequence

from ....domain.repositories.block_feedback_repository import (
    BlockFeedback,
    BlockFeedbackRepository,
)
from .. import models as m


class DjangoBlockFeedbackRepository(BlockFeedbackRepository):
    def save(self, feedback: BlockFeedback) -> BlockFeedback:
        m.BlockFeedbackModel.objects.update_or_create(
            user_id=feedback.user_id,
            event_client_id=feedback.event_client_id,
            defaults={
                'rating': feedback.rating,
                'mood': feedback.mood,
                'subject': feedback.subject,
                'planned_minutes': feedback.planned_minutes,
                'actual_minutes': feedback.actual_minutes,
                'start_hour': feedback.start_hour,
            },
        )
        return feedback

    def list_recent(self, user_id: int, *, limit: int = 30) -> tuple[BlockFeedback, ...]:
        rows = m.BlockFeedbackModel.objects.filter(user_id=user_id)[:limit]
        return tuple(_to_entity(row) for row in rows)

    def rated_client_ids(self, user_id: int, client_ids: Sequence[str]) -> frozenset[str]:
        ids = [str(value) for value in client_ids if value]
        if not ids:
            return frozenset()
        return frozenset(
            m.BlockFeedbackModel.objects
            .filter(user_id=user_id, event_client_id__in=ids)
            .values_list('event_client_id', flat=True)
        )


def _to_entity(row: m.BlockFeedbackModel) -> BlockFeedback:
    return BlockFeedback(
        user_id=row.user_id,
        event_client_id=row.event_client_id,
        rating=row.rating,
        mood=row.mood,
        subject=row.subject,
        planned_minutes=row.planned_minutes,
        actual_minutes=row.actual_minutes,
        start_hour=row.start_hour,
    )
