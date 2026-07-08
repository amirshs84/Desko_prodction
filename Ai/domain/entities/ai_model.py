"""AIModel — یک مدل هوش مصنوعی در رجیستری (Aggregate Root).

مدل‌ها config-driven هستند (در دیتابیس، نه hardcode) تا افزودن/فعال‌سازی مدل
بدون deploy ممکن باشد. ``capabilities`` تعیین می‌کند ProviderFactory این مدل را
برای چه نوع درخواستی (chat/vision/tools/embedding/stt) انتخاب کند.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from ..enums import Capability
from ...shared.domain.entity import AggregateRoot


@dataclass(eq=False)
class AIModel(AggregateRoot):
    id: UUID
    provider_key: str
    key: str
    display_name: str
    context_window: int
    max_output_tokens: int
    capabilities: frozenset[Capability] = field(default_factory=frozenset)
    priority: int = 0
    is_active: bool = True

    def supports(self, capability: Capability) -> bool:
        return capability in self.capabilities

    def deactivate(self) -> None:
        # غیرفعال‌سازی نرم؛ ارجاع‌های تاریخی در پیام‌ها حفظ می‌شود.
        self.is_active = False
