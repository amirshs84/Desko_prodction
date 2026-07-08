"""DTO خروجی مکالمه.

جدا از Serializer (که به HTTP وابسته است) و جدا از Entity (که فیلدهای داخلی
دارد). فقط داده‌ی امنِ لازم برای بیرون را حمل می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...domain.entities.conversation import Conversation


@dataclass(frozen=True)
class ConversationDTO:
    id: UUID
    title: str
    status: str
    is_pinned: bool
    is_favorite: bool
    model_id: UUID
    version: int

    @classmethod
    def from_entity(cls, c: Conversation) -> "ConversationDTO":
        return cls(
            id=c.id,
            title=c.title,
            status=c.status.value,
            is_pinned=c.flags.is_pinned,
            is_favorite=c.flags.is_favorite,
            model_id=c.model_config.model_id,
            version=c.version,
        )
