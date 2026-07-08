"""Port: VectorStore — ذخیره و جست‌وجوی شباهت برداری.

انتزاع روی backend برداری: در dev/تست یک پیاده‌سازی brute-force روی JSON (سازگار
با SQLite)، و در prod آداپتور pgvector با عملگر ``<=>`` — هر دو پشت همین Port.
سرویس‌ها هرگز نمی‌دانند بردارها کجا و چگونه ذخیره می‌شوند (Dependency Inversion).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol
from uuid import UUID


@dataclass(frozen=True)
class VectorRecord:
    """یک chunk به‌همراه بردار تعبیه‌اش برای درج در store."""

    chunk_id: UUID
    attachment_id: UUID
    chunk_index: int
    content: str
    embedding: list[float]
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True)
class VectorMatch:
    """نتیجه‌ی جست‌وجوی شباهت (score بالاتر = شبیه‌تر)."""

    chunk_id: UUID
    attachment_id: UUID
    content: str
    score: float


class VectorStore(Protocol):
    def upsert(self, *, tenant_id: UUID, records: list[VectorRecord]) -> None: ...

    def search(
        self,
        *,
        tenant_id: UUID,
        embedding: list[float],
        top_k: int,
        attachment_ids: list[UUID] | None = None,
    ) -> list[VectorMatch]: ...

    def delete_by_attachment(self, *, tenant_id: UUID, attachment_id: UUID) -> None: ...
