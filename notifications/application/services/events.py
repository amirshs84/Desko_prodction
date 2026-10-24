from __future__ import annotations

import uuid

from ...domain.entities import InteractionEvent, Notification
from ...domain.enums import EventSource


def lifecycle_to_interactions(n: Notification) -> list[InteractionEvent]:
    """رویدادهای چرخه‌ی عمر aggregate → سطرهای لاگ append-only."""
    return [
        InteractionEvent(
            client_event_id=uuid.uuid4(),
            type=e.type,
            user_id=n.recipient_id,
            occurred_at=e.occurred_at,
            source=EventSource.SERVER,
            notification_id=n.id,
            category_key=n.category_key,
            metadata=e.metadata,
        )
        for e in n.pull_events()
    ]
