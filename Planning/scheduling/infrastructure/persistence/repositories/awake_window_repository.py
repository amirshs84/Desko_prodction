"""پیاده‌سازی Django مخزن بازه‌ی فعال دانش‌آموز."""
from __future__ import annotations

from typing import Sequence

from ....domain.repositories.awake_window_repository import AwakeWindowRepository
from ....domain.services.awake_window_policy import AwakeWindowPolicy
from .. import models as m


class DjangoAwakeWindowRepository(AwakeWindowRepository):
    def get(self, user_id: int) -> AwakeWindowPolicy:
        row = m.StudentAwakeWindowModel.objects.filter(user_id=user_id).first()
        return _to_policy(row)

    def get_many(self, user_ids: Sequence[int]) -> dict[int, AwakeWindowPolicy]:
        ids = list(user_ids)
        if not ids:
            return {}
        rows = {
            row.user_id: row
            for row in m.StudentAwakeWindowModel.objects.filter(user_id__in=ids)
        }
        return {user_id: _to_policy(rows.get(user_id)) for user_id in ids}

    def save(self, user_id: int, policy: AwakeWindowPolicy) -> AwakeWindowPolicy:
        m.StudentAwakeWindowModel.objects.update_or_create(
            user_id=user_id,
            defaults={
                'start_minutes': policy.window.start_minutes,
                'end_minutes': policy.window.end_minutes,
            },
        )
        return policy

    def reset(self, user_id: int) -> AwakeWindowPolicy:
        m.StudentAwakeWindowModel.objects.filter(user_id=user_id).delete()
        return AwakeWindowPolicy.default()


def _to_policy(row: 'm.StudentAwakeWindowModel | None') -> AwakeWindowPolicy:
    if row is None:
        return AwakeWindowPolicy.default()
    return AwakeWindowPolicy.from_minutes(row.start_minutes, row.end_minutes)
