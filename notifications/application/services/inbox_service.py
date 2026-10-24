from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from typing import Any

from ...domain.repositories import NotificationRepository
from ..dto import notification_to_dict
from ..ports import Clock

IN_APP_LOOKBACK = timedelta(days=3)


class InboxService:
    def __init__(self, *, notifications: NotificationRepository, clock: Clock) -> None:
        self._notifications = notifications
        self._clock = clock

    def list(
        self, user_id: int, *, before: datetime | None, limit: int, unread_only: bool
    ) -> dict[str, Any]:
        limit = max(1, min(limit, 100))
        items = self._notifications.list_inbox(
            user_id, before=before, limit=limit + 1, unread_only=unread_only
        )
        has_more = len(items) > limit
        items = items[:limit]
        return {
            "items": [notification_to_dict(n) for n in items],
            "next_before": items[-1].created_at.isoformat() if has_more and items else None,
            "unread_count": self._notifications.unread_count(user_id),
        }

    def unread_count(self, user_id: int) -> int:
        return self._notifications.unread_count(user_id)

    def mark_read(self, user_id: int, ids: list[uuid.UUID] | None) -> int:
        return self._notifications.mark_read(user_id, ids, self._clock.now())

    def pending_in_app(self, user_id: int) -> list[dict[str, Any]]:
        since = self._clock.now() - IN_APP_LOOKBACK
        return [
            notification_to_dict(n)
            for n in self._notifications.pending_in_app(user_id, since, limit=5)
        ]
