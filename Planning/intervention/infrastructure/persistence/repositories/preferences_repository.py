"""پیاده‌سازی مخزن ترجیحات مشاور."""
from __future__ import annotations

from typing import Any

from ....domain.repositories.preferences_repository import PreferencesRepository
from .. import models as m


class DjangoPreferencesRepository(PreferencesRepository):
    def get_or_create(
        self, *, consultant_id: int, school_id: int | None,
    ) -> dict[str, Any]:
        row, _ = m.ConsultantPreferencesModel.objects.get_or_create(
            consultant_id=consultant_id,
            defaults={
                'school_id': school_id,
                'quick_replies': [],
                'visible_roster_columns': [],
                'notifications': {},
                'working_hours': {},
            },
        )
        if school_id and row.school_id != school_id:
            row.school_id = school_id
            row.save(update_fields=['school_id', 'updated_at'])
        return _row_to_dict(row)

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
        row, _ = m.ConsultantPreferencesModel.objects.update_or_create(
            consultant_id=consultant_id,
            defaults={
                'school_id': school_id,
                'quick_replies': quick_replies,
                'visible_roster_columns': visible_roster_columns,
                'notifications': notifications,
                'working_hours': working_hours,
            },
        )
        return _row_to_dict(row)


def _row_to_dict(row: m.ConsultantPreferencesModel) -> dict[str, Any]:
    return {
        'quick_replies': list(row.quick_replies or []),
        'visible_roster_columns': list(row.visible_roster_columns or []),
        'notifications': dict(row.notifications or {}),
        'working_hours': dict(row.working_hours or {}),
    }
