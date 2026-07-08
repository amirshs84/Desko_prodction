"""انتزاع Clock — زمان به‌عنوان یک وابستگی تزریق‌شده.

چرا Clock به‌جای فراخوانی مستقیم datetime.now()؟ تست‌پذیری. با تزریق Clock
می‌توان زمان را در تست «منجمد» کرد و رفتار وابسته به زمان (انقضای توکن، quota
روزانه، summary) را قطعی (deterministic) آزمود.

همه‌ی زمان‌ها timezone-aware و بر مبنای UTC هستند؛ تبدیل به Asia/Tehran فقط در
لایه‌ی نمایش انجام می‌شود.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime: ...


class SystemClock:
    """پیاده‌سازی واقعی: زمان جاری سیستم به‌صورت UTC."""

    def now(self) -> datetime:
        return datetime.now(timezone.utc)


class FrozenClock:
    """پیاده‌سازی تست: همیشه یک لحظه‌ی ثابت را برمی‌گرداند."""

    def __init__(self, moment: datetime) -> None:
        self._moment = moment

    def now(self) -> datetime:
        return self._moment
