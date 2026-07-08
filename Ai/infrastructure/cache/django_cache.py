"""DjangoCacheClient — CacheClient روی ``django.core.cache``.

با استفاده از چارچوب کش Django، backend واقعی (LocMem در توسعه، Redis در تولید
از طریق django-redis) یک دغدغه‌ی تنظیمات است، نه کد. این ما را از import مستقیم
کتابخانه‌ی redis جدا نگه می‌دارد (جایگزین‌پذیری backend).

نکته‌ی مهم درباره اتمیک بودن ``incr``:
  - backend مبتنی بر Redis این عملیات را اتمیک انجام می‌دهد (مناسب quota).
  - backend حافظه‌ی محلی (LocMem) بین پروسه‌ها اتمیک نیست و فقط برای
    توسعه/تست مناسب است.
"""
from __future__ import annotations

from typing import Any

from django.core.cache import cache as _default_cache


class DjangoCacheClient:
    def __init__(self, backend=None) -> None:
        self._cache = backend or _default_cache

    def get(self, key: str) -> Any | None:
        return self._cache.get(key)

    def set(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> None:
        self._cache.set(key, value, timeout=ttl_seconds)

    def delete(self, key: str) -> None:
        self._cache.delete(key)

    def incr(self, key: str, amount: int = 1, *, ttl_seconds: int | None = None) -> int:
        # اگر کلید وجود نداشته باشد، ابتدا با TTL مقداردهی اولیه می‌کنیم تا هم از
        # DoesNotExist جلوگیری شود و هم پنجره‌ی انقضا (مثلاً پایان روز) ست شود.
        if self._cache.add(key, 0, timeout=ttl_seconds):
            # کلید تازه ساخته شد؛ TTL از همین add اعمال شده است.
            pass
        return self._cache.incr(key, amount)

    def add(self, key: str, value: Any, *, ttl_seconds: int | None = None) -> bool:
        return bool(self._cache.add(key, value, timeout=ttl_seconds))
