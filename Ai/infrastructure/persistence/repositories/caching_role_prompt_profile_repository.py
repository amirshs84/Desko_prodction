"""CachingRolePromptProfileRepository — دکوراتور کش روی پروفایل پرامپت نقش‌ها.

``resolve(role, tenant_id)`` در هر تولید پاسخ برای ساخت system prompt نقش‌محور
فراخوانی می‌شود؛ کش read-through این مسیر داغ را از DB جدا می‌کند.

ابطال رویداد‌محور: ``save`` (به‌روزرسانی پروفایل از ادمین) کش resolve همان
نقش/مستأجر را باطل می‌کند تا تغییر بلافاصله دیده شود (سازگاری خواندن‌بعد‌از‌نوشتن).

negative caching با sentinel: نبودِ پروفایل سفارشی (حالت رایج) هم کش می‌شود تا هر
درخواست به DB نخورد.
"""
from __future__ import annotations

from uuid import UUID

from ....application.ports.cache import CacheClient
from ....domain.entities.role_prompt_profile import RolePromptProfile
from ....domain.enums import UserRole
from ....domain.repositories.role_prompt_profile_repository import (
    RolePromptProfileRepository,
)
from ...cache.keys import CacheKeys

_MISS = "__miss__"

# مستأجر پیش‌فرض برای پروفایل‌های سراسری هنگام ابطال (tenant_id واقعی از profile).
_GLOBAL_TENANT_SENTINEL = "global"


class CachingRolePromptProfileRepository(RolePromptProfileRepository):
    def __init__(
        self,
        inner: RolePromptProfileRepository,
        *,
        cache: CacheClient,
        keys: CacheKeys,
        ttl_seconds: int = 300,
    ) -> None:
        self._inner = inner
        self._cache = cache
        self._keys = keys
        self._ttl = ttl_seconds

    def resolve(
        self, *, role: UserRole, tenant_id: UUID
    ) -> RolePromptProfile | None:
        cache_key = self._keys.prompt_resolve(tenant_id, role.value)
        cached = self._cache.get(cache_key)
        if cached == _MISS:
            return None
        if cached is not None:
            return cached
        value = self._inner.resolve(role=role, tenant_id=tenant_id)
        self._cache.set(
            cache_key, value if value is not None else _MISS, ttl_seconds=self._ttl
        )
        return value

    def get(self, profile_id: UUID) -> RolePromptProfile | None:
        return self._inner.get(profile_id)

    def save(self, profile: RolePromptProfile) -> None:
        self._inner.save(profile)
        self.invalidate(role=profile.role, tenant_id=profile.tenant_id)

    def invalidate(self, *, role: UserRole, tenant_id: UUID | None) -> None:
        """ابطال کش resolve برای یک نقش/مستأجر (مسیر ادمین — لایه ۱۸)."""
        self._cache.delete(self._keys.prompt_resolve(tenant_id, role.value))
