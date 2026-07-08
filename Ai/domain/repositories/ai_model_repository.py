"""قرارداد Repository رجیستری مدل‌های هوش مصنوعی (Port خروجی دامنه)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from ..entities.ai_model import AIModel
from ..enums import Capability


class AIModelRepository(ABC):
    @abstractmethod
    def get(self, model_id: UUID) -> AIModel | None: ...

    @abstractmethod
    def get_by_key(self, key: str) -> AIModel | None: ...

    @abstractmethod
    def list_active(self, *, capability: Capability | None = None) -> list[AIModel]:
        """مدل‌های فعال؛ در صورت نیاز فیلترشده بر اساس قابلیت."""
