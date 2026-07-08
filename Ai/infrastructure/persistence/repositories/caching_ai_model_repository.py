"""CachingAIModelRepository — دکوراتور کش روی رجیستری مدل‌ها.

الگوی Decorator: همان interface ``AIModelRepository`` را پیاده می‌کند و یک repo
واقعی را می‌پیچد. مصرف‌کننده (سرویس‌ها) تفاوتی نمی‌بینند (Liskov + Open/Closed).

چرا اینجا کش می‌گذاریم؟ رجیستری مدل‌ها config-driven و «خواندنی‌سنگین در مسیر
داغ» است: در هر تولید پاسخ و هر ساخت مکالمه خوانده می‌شود اما به‌ندرت تغییر
می‌کند — کاندیدای ایده‌آل read-through cache.

negative caching: نتیجه‌ی «یافت‌نشد» هم کش می‌شود (با یک sentinel) تا جست‌وجوی
مکرر مدل ناموجود به DB فشار نیاورد.
"""
from __future__ import annotations

from uuid import UUID

from ....application.ports.cache import CacheClient
from ....domain.entities.ai_model import AIModel
from ....domain.enums import Capability
from ....domain.repositories.ai_model_repository import AIModelRepository
from ...cache.keys import CacheKeys

_MISS = "__miss__"  # sentinel برای negative caching


class CachingAIModelRepository(AIModelRepository):
    def __init__(
        self,
        inner: AIModelRepository,
        *,
        cache: CacheClient,
        keys: CacheKeys,
        ttl_seconds: int = 300,
    ) -> None:
        self._inner = inner
        self._cache = cache
        self._keys = keys
        self._ttl = ttl_seconds

    def get(self, model_id: UUID) -> AIModel | None:
        key = self._keys.model(model_id)
        return self._read_through(key, lambda: self._inner.get(model_id))

    def get_by_key(self, key: str) -> AIModel | None:
        cache_key = self._keys.model_by_key(key)
        return self._read_through(cache_key, lambda: self._inner.get_by_key(key))

    def list_active(self, *, capability: Capability | None = None) -> list[AIModel]:
        cap = capability.value if capability else None
        cache_key = self._keys.active_models_global(cap)
        cached = self._cache.get(cache_key)
        if cached is not None:
            return list(cached)
        models = self._inner.list_active(capability=capability)
        self._cache.set(cache_key, models, ttl_seconds=self._ttl)
        return models

    def invalidate(self, model_id: UUID | None = None, key: str | None = None) -> None:
        """ابطال کش (برای مسیر ادمین/به‌روزرسانی config — لایه ۱۸)."""
        if model_id is not None:
            self._cache.delete(self._keys.model(model_id))
        if key is not None:
            self._cache.delete(self._keys.model_by_key(key))
        # فهرست‌های فعال (all + هر قابلیت) نیز باید باطل شوند.
        self._cache.delete(self._keys.active_models_global(None))
        for cap in Capability:
            self._cache.delete(self._keys.active_models_global(cap.value))

    # ---------- کمکی ----------

    def _read_through(self, cache_key: str, loader):
        cached = self._cache.get(cache_key)
        if cached == _MISS:
            return None
        if cached is not None:
            return cached
        value = loader()
        self._cache.set(cache_key, value if value is not None else _MISS, ttl_seconds=self._ttl)
        return value
