"""QuotaService — کنترل سهمیه‌ی روزانه‌ی پیام.

شمارش با ``incr`` اتمیک روی CacheClient (در تولید: Redis) انجام می‌شود تا در
۱۰۰۰ کاربر همزمان دچار race/row-lock نشویم. کلید در پایان روز منقضی می‌شود.

نکته: source of truth مالی ``UsageRecord`` است؛ این شمارنده صرفاً یک گِیت سریع
است. سیاست کامل (QuotaPolicy بر اساس Plan) در لایه‌های بعد جایگزین سقف ثابت
پیکربندی می‌شود.
"""
from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from uuid import UUID

from ...shared.domain.errors import QuotaExceededError
from ..ports.cache import CacheClient


def _seconds_until_utc_midnight(now: datetime) -> int:
    tomorrow = (now + timedelta(days=1)).date()
    midnight = datetime.combine(tomorrow, time.min, tzinfo=timezone.utc)
    return max(1, int((midnight - now).total_seconds()))


class QuotaService:
    def __init__(self, *, cache: CacheClient, keys, clock, daily_limit: int) -> None:
        self._cache = cache
        self._keys = keys
        self._clock = clock
        self._daily_limit = daily_limit

    def check_and_consume(self, *, tenant_id: UUID, user_id: UUID) -> None:
        now = self._clock.now()
        day = now.date()
        key = self._keys.quota(tenant_id, user_id, day)
        ttl = _seconds_until_utc_midnight(now)
        count = self._cache.incr(key, ttl_seconds=ttl)
        if count > self._daily_limit:
            raise QuotaExceededError(
                detail=f"سقف {self._daily_limit} پیام در روز استفاده شده است.",
                meta={"limit": self._daily_limit, "used": count},
            )
