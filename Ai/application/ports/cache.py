"""Port: CacheClient — انتزاع کش/شمارنده‌ی سریع.

این قرارداد عمداً کوچک و backend-agnostic است. در تولید، پیاده‌سازی روی Redis
سوار می‌شود (لایه ۱۷)، اما دامنه/سرویس فقط این interface را می‌بینند.

``incr`` برای شمارنده‌ی quota روزانه حیاتی است: باید در backend واقعی (Redis)
اتمیک باشد تا در ۱۰۰۰ کاربر همزمان دچار race condition نشود.
"""
from __future__ import annotations

from typing import Any, Protocol


class CacheClient(Protocol):
    def get(self, key: str) -> Any | None: ...

    def set(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> None: ...

    def delete(self, key: str) -> None: ...

    def incr(self, key: str, amount: int = 1, *, ttl_seconds: int | None = None) -> int:
        """افزایش اتمیک شمارنده؛ اگر کلید نبود از صفر شروع می‌شود."""
        ...

    def add(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> bool:
        """فقط اگر کلید وجود نداشته باشد ست می‌کند (SETNX)؛ پایه‌ی قفل/idempotency."""
        ...
