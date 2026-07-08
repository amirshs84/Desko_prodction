"""DjangoVectorStore — پیاده‌سازی VectorStore با ORM (dev/تست).

جست‌وجوی شباهت به‌صورت brute-force کسینوسی در پایتون انجام می‌شود؛ این با SQLite
کار می‌کند و برای حجم توسعه کافی است. در prod این آداپتور با pgvector (عملگر
``<=>`` و ایندکس HNSW) جایگزین می‌شود — امضای Port تغییری نمی‌کند.

هشدار مقیاس: brute-force روی O(n) chunk است؛ فقط برای dev. جست‌وجو همیشه به
``tenant_id`` محدود می‌شود (ایزولاسیون Multi-Tenant).
"""
from __future__ import annotations

import math
from uuid import UUID

from ...application.ports.vector_store import VectorMatch, VectorRecord
from ..persistence.models import DocumentChunkModel


class DjangoVectorStore:
    def upsert(self, *, tenant_id: UUID, records: list[VectorRecord]) -> None:
        for rec in records:
            DocumentChunkModel.all_objects.update_or_create(
                id=rec.chunk_id,
                defaults={
                    "tenant_id": tenant_id,
                    "attachment_id": rec.attachment_id,
                    "chunk_index": rec.chunk_index,
                    "content": rec.content,
                    "embedding": rec.embedding,
                    "dim": len(rec.embedding),
                },
            )

    def search(
        self,
        *,
        tenant_id: UUID,
        embedding: list[float],
        top_k: int,
        attachment_ids: list[UUID] | None = None,
    ) -> list[VectorMatch]:
        qs = DocumentChunkModel.objects.filter(tenant_id=tenant_id)
        if attachment_ids:
            qs = qs.filter(attachment_id__in=attachment_ids)

        q_norm = _norm(embedding)
        if q_norm == 0.0:
            return []

        scored: list[VectorMatch] = []
        for row in qs.only(
            "id", "attachment_id", "content", "embedding"
        ).iterator():
            score = _cosine(embedding, row.embedding, q_norm)
            scored.append(
                VectorMatch(
                    chunk_id=row.id,
                    attachment_id=row.attachment_id,
                    content=row.content,
                    score=score,
                )
            )
        scored.sort(key=lambda m: m.score, reverse=True)
        return scored[:top_k]

    def delete_by_attachment(self, *, tenant_id: UUID, attachment_id: UUID) -> None:
        # حذف فیزیکی (نه soft): هنگام ری‌ایندکس باید chunkهای قبلی واقعاً بروند،
        # وگرنه ردیف‌های حذف‌شده constraint یکتای (attachment_id, chunk_index) را
        # اشغال می‌کنند و درج مجدد شکست می‌خورد.
        DocumentChunkModel.all_objects.filter(
            tenant_id=tenant_id, attachment_id=attachment_id
        ).hard_delete()


def _norm(vec: list[float]) -> float:
    return math.sqrt(sum(v * v for v in vec))


def _cosine(a: list[float], b: list[float], a_norm: float) -> float:
    if not b or len(a) != len(b):
        return -1.0
    b_norm = _norm(b)
    if b_norm == 0.0:
        return -1.0
    dot = sum(x * y for x, y in zip(a, b))
    return dot / (a_norm * b_norm)
