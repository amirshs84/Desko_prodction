"""پورت مخزن ترجیحات مشاور."""
from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class PreferencesRepository(Protocol):
    def get_or_create(
        self, *, consultant_id: int, school_id: int | None,
    ) -> dict[str, Any]:
        """برمی‌گرداند: quick_replies, visible_roster_columns, notifications, working_hours."""
        ...

    def save(
        self,
        *,
        consultant_id: int,
        school_id: int | None,
        quick_replies: list,
        visible_roster_columns: list,
        notifications: dict,
        working_hours: dict,
    ) -> dict[str, Any]:
        ...
