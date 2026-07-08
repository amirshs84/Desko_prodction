"""RolePromptProfile — پروفایل system prompt بر اساس نقش کاربر (Aggregate Root).

نیازمندی صریح: نقش‌های Student/Teacher/Consultant/Manager هرکدام system prompt و
پارامترهای متفاوتی به درخواست هوش مصنوعی تزریق می‌کنند.

طراحی config-driven و نسخه‌دار:
  - ``tenant_id = None`` یعنی پروفایل پیش‌فرض سراسری؛ مقدار داشتن یعنی override
    مختص یک مستأجر.
  - ``version`` تغییر prompt را ردیابی می‌کند تا مکالمات قدیمی با نسخه‌ی زمان
    شروع خود سازگار بمانند (بدون شکستن رفتار).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from ...shared.domain.entity import AggregateRoot
from ...shared.domain.errors import ValidationError
from ..enums import UserRole


@dataclass(eq=False)
class RolePromptProfile(AggregateRoot):
    id: UUID
    role: UserRole
    system_prompt: str
    tenant_id: UUID | None = None  # None = پیش‌فرض سراسری
    parameters: dict[str, Any] = field(default_factory=dict)
    guardrails: dict[str, Any] = field(default_factory=dict)
    version: int = 1
    is_active: bool = True

    def update_prompt(self, system_prompt: str) -> None:
        if not system_prompt or not system_prompt.strip():
            raise ValidationError("system prompt نمی‌تواند خالی باشد.")
        self.system_prompt = system_prompt.strip()
        self.version += 1  # هر تغییر، نسخه‌ی جدید (برای rollback و سازگاری)

    @property
    def is_global_default(self) -> bool:
        return self.tenant_id is None
