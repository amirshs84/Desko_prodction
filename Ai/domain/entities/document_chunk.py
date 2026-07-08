"""DocumentChunk — یک قطعه‌ی متنی از پیوست، آماده‌ی تعبیه/بازیابی (Entity).

پیوست‌های بزرگ به قطعات کوچک (chunk) تقسیم می‌شوند تا هم در پنجره‌ی مدل بگنجند و
هم بازیابی دقیق‌تر باشد (شباهت روی قطعه‌ی مرتبط، نه کل سند). بردار تعبیه یک
جزئیات زیرساختی است و در store برداری نگهداری می‌شود، نه در این موجودیت.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...shared.domain.entity import Entity
from ...shared.infrastructure.ids import uuid7


@dataclass(eq=False)
class DocumentChunk(Entity):
    id: UUID
    tenant_id: UUID
    attachment_id: UUID
    chunk_index: int
    content: str
    token_count: int = 0

    @classmethod
    def create(
        cls,
        *,
        tenant_id: UUID,
        attachment_id: UUID,
        chunk_index: int,
        content: str,
        token_count: int = 0,
    ) -> "DocumentChunk":
        return cls(
            id=uuid7(),
            tenant_id=tenant_id,
            attachment_id=attachment_id,
            chunk_index=chunk_index,
            content=content,
            token_count=token_count,
        )
