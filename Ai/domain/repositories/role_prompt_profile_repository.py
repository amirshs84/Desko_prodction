"""قرارداد Repository پروفایل system prompt نقش‌ها (Port خروجی دامنه)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from ..entities.role_prompt_profile import RolePromptProfile
from ..enums import UserRole


class RolePromptProfileRepository(ABC):
    @abstractmethod
    def resolve(
        self, *, role: UserRole, tenant_id: UUID
    ) -> RolePromptProfile | None:
        """پروفایل فعال را resolve می‌کند.

        ترتیب اولویت: override مختص مستأجر → سپس پیش‌فرض سراسری (tenant_id=None).
        این منطق «اولویت» در پیاده‌سازی repository لایه ۵ اعمال می‌شود.
        """

    @abstractmethod
    def get(self, profile_id: UUID) -> RolePromptProfile | None: ...

    @abstractmethod
    def save(self, profile: RolePromptProfile) -> None: ...
