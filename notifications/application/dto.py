"""DTO های خروجی (همان شکلی که REST، WebSocket و پیلود پوش مصرف می‌کنند)."""
from __future__ import annotations

from typing import Any

from ..domain.entities import LocalReminder, Notification


def notification_to_dict(n: Notification) -> dict[str, Any]:
    return {
        "id": str(n.id),
        "category": n.category_key,
        "priority": n.priority.value,
        **n.content.to_dict(),
        "deeplink": n.deeplink,
        "collapse_key": n.collapse_key,
        "created_at": n.created_at.isoformat(),
        "expires_at": n.expires_at.isoformat() if n.expires_at else None,
        "read_at": n.read_at.isoformat() if n.read_at else None,
    }


def reminder_to_dict(r: LocalReminder, *, enabled: bool = True) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "source_key": r.source_key,
        "category": r.category_key,
        "priority": r.priority.value,
        "fire_at": r.fire_at.isoformat(),
        "deeplink": r.deeplink,
        "cancelled": r.cancelled or not enabled,
        "updated_at": r.updated_at.isoformat(),
        **r.content.to_dict(),
    }
