"""سقف مطالعه‌ی ثابت — پیاده‌سازی MVP قید فرسودگی.

اعداد پیش‌فرض محافظه‌کارانه‌اند: حداکثر ۳ ساعت از یک درس در یک روز و ۱۲ ساعت از
یک درس در کل بازه. وقتی داده‌ی واقعی مطالعه جمع شد، این کلاس با نسخه‌ای شخصی‌سازی‌شده
(بر اساس سابقه‌ی هر دانش‌آموز) جایگزین می‌شود بدون تغییر در موتور.
"""
from __future__ import annotations

from typing import Mapping

DEFAULT_MAX_DAILY_MINUTES = 180
DEFAULT_MAX_WINDOW_MINUTES = 720


class StaticBurnoutPolicy:
    def __init__(
        self,
        *,
        max_daily_minutes: int | None = DEFAULT_MAX_DAILY_MINUTES,
        max_window_minutes: int | None = DEFAULT_MAX_WINDOW_MINUTES,
        per_subject_daily: Mapping[str, int] | None = None,
    ) -> None:
        self._daily = max_daily_minutes
        self._window = max_window_minutes
        self._per_subject_daily = dict(per_subject_daily or {})

    def max_daily_minutes(self, subject: str) -> int | None:
        return self._per_subject_daily.get(subject, self._daily)

    def max_window_minutes(self, subject: str) -> int | None:
        return self._window
