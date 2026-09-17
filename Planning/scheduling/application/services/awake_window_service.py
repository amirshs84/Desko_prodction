"""بازه‌ی فعال دانش‌آموز — خواندن و ویرایش.

مالک این تنظیم، دانش‌آموز است نه مشاور: کسی که می‌داند ساعت هفت صبح بیدار است یا
ده، خودش است. مشاور فقط می‌تواند آن را ببیند (برای فهمیدن اینکه چرا برنامه‌ی یک
دانش‌آموز کوتاه‌تر درآمده)، نه عوض کند.

مثل بقیه‌ی سرویس‌های این کانتکست، تشخیص «چه کسی حق دیدن/نوشتن تقویم چه کسی را
دارد» وظیفه‌ی لایه‌ی interface است؛ اینجا فقط ``owner_id`` تأییدشده می‌آید.
"""
from __future__ import annotations

from typing import Any

from ....shared.domain.errors import ValidationError
from ...domain.repositories.awake_window_repository import AwakeWindowRepository
from ...domain.services.awake_window_policy import (
    MIN_AWAKE_MINUTES,
    AwakeWindowPolicy,
)


class AwakeWindowService:
    def __init__(self, *, windows: AwakeWindowRepository) -> None:
        self._windows = windows

    def get(self, owner_id: int) -> dict[str, Any]:
        return _payload(self._windows.get(owner_id))

    def update(self, owner_id: int, patch: dict[str, Any]) -> dict[str, Any]:
        policy = AwakeWindowPolicy.from_minutes(
            _minutes(patch, 'start_minutes'),
            _minutes(patch, 'end_minutes'),
        )
        return _payload(self._windows.save(owner_id, policy))

    def reset(self, owner_id: int) -> dict[str, Any]:
        return _payload(self._windows.reset(owner_id))


def _minutes(patch: dict[str, Any], key: str) -> int:
    value = patch.get(key)
    if value is None:
        raise ValidationError('شروع و پایان بازه‌ی فعال هر دو لازم است.')
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError('شروع و پایان بازه‌ی فعال باید عدد دقیقه باشد.') from exc


def _payload(policy: AwakeWindowPolicy) -> dict[str, Any]:
    default = AwakeWindowPolicy.default()
    return {
        'start_minutes': policy.window.start_minutes,
        'end_minutes': policy.window.end_minutes,
        'label': str(policy.window),
        'capacity_minutes': policy.capacity_minutes,
        'is_default': policy.is_default,
        'min_duration_minutes': MIN_AWAKE_MINUTES,
        'default_start_minutes': default.window.start_minutes,
        'default_end_minutes': default.window.end_minutes,
    }
