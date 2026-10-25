"""پورت مخزن ترجیحات مشاور."""
from __future__ import annotations

from typing import Any, Protocol, runtime_checkable


@runtime_checkable
class PreferencesRepository(Protocol):
    def get_or_create(
        self, *, consultant_id: int, school_id: int | None,
    ) -> dict[str, Any]:
        """برمی‌گرداند ترجیحات ذخیره‌شده، از جمله مرخصی و هشدارها."""
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
        on_leave: bool,
        reserve_slots: int,
        smart_alerts: dict,
    ) -> dict[str, Any]:
        ...
