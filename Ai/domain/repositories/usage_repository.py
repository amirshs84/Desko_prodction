"""قرارداد Repository مصرف/صورتحساب (Port خروجی دامنه).

فقط افزودن و خواندن تجمیعی؛ به‌عمد متد update/delete ندارد چون UsageRecord
تغییرناپذیر و append-only است (یکپارچگی مالی).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from decimal import Decimal
from uuid import UUID

from ..entities.usage_record import UsageRecord
from ..value_objects.token_usage import TokenUsage


class UsageRepository(ABC):
    @abstractmethod
    def add(self, record: UsageRecord) -> None: ...

    @abstractmethod
    def aggregate_for_period(
        self,
        *,
        tenant_id: UUID,
        user_id: UUID | None,
        start: date,
        end: date,
    ) -> tuple[TokenUsage, Decimal]:
        """مجموع مصرف و هزینه در بازه‌ی زمانی (برای گزارش/quota)."""
