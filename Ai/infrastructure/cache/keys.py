"""ساخت کلیدهای کش با namespace و محدوده‌ی مستأجر.

چرا namespace با tenant؟ همه‌ی کلیدها با ``{namespace}:{tenant}:...`` ساخته
می‌شوند تا از نشت داده بین مستأجرها روی همان Redis جلوگیری شود و امکان
invalidation هدفمند وجود داشته باشد.
"""
from __future__ import annotations

from datetime import date
from uuid import UUID


class CacheKeys:
    def __init__(self, namespace: str = "ai") -> None:
        self._ns = namespace

    def _base(self, tenant_id: UUID) -> str:
        return f"{self._ns}:{tenant_id}"

    def quota(self, tenant_id: UUID, user_id: UUID, day: date) -> str:
        return f"{self._base(tenant_id)}:quota:{user_id}:{day.isoformat()}"

    def active_models(self, tenant_id: UUID) -> str:
        return f"{self._base(tenant_id)}:models"

    # مدل‌ها سراسری‌اند (config-driven، غیر‌مختص مستأجر) → کلید بدون tenant.
    def model(self, model_id: UUID) -> str:
        return f"{self._ns}:model:{model_id}"

    def model_by_key(self, key: str) -> str:
        return f"{self._ns}:model:key:{key}"

    def active_models_global(self, capability: str | None = None) -> str:
        return f"{self._ns}:models:active:{capability or 'all'}"

    def prompt_profile(self, tenant_id: UUID, role: str, version: int) -> str:
        return f"{self._base(tenant_id)}:prompt:{role}:v{version}"

    # کلید resolve پروفایل (بدون version؛ برای کش read-through مسیر تولید).
    def prompt_resolve(self, tenant_id: UUID, role: str) -> str:
        return f"{self._base(tenant_id)}:prompt:resolve:{role}"

    def conversation_list(self, tenant_id: UUID, user_id: UUID) -> str:
        return f"{self._base(tenant_id)}:conv:list:{user_id}"

    def idempotency(self, tenant_id: UUID, key: str) -> str:
        return f"{self._base(tenant_id)}:idem:{key}"
