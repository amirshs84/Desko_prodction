"""ConversationSummary — خلاصه‌ی incremental تاریخچه‌ی مکالمه (Aggregate Root).

استراتژی: به‌جای خلاصه‌کردن مکرر کل مکالمه، فقط دلتای جدید (پیام‌های بعد از
``up_to_seq``) به خلاصه‌ی قبلی افزوده می‌شود (rolling). این هم توکن و هزینه صرفه‌
می‌کند و هم امکان مکالمه‌ی بسیار طولانی را با پنجره‌ی محدود مدل فراهم می‌آورد.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...shared.domain.entity import AggregateRoot
from ...shared.infrastructure.ids import uuid7


@dataclass(eq=False)
class ConversationSummary(AggregateRoot):
    id: UUID
    tenant_id: UUID
    conversation_id: UUID
    up_to_seq: int  # تا این seq از مکالمه در خلاصه پوشش داده شده است.
    summary: str
    token_count: int

    @classmethod
    def create(
        cls,
        *,
        tenant_id: UUID,
        conversation_id: UUID,
        up_to_seq: int,
        summary: str,
        token_count: int,
    ) -> "ConversationSummary":
        return cls(
            id=uuid7(),
            tenant_id=tenant_id,
            conversation_id=conversation_id,
            up_to_seq=up_to_seq,
            summary=summary,
            token_count=token_count,
        )
