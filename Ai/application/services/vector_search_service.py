"""VectorSearchService — تعبیه، ذخیره و جست‌وجوی برداری قطعات پیوست.

مسئولیت‌ها:
  - ``index_attachment`` : متن استخراج‌شده را chunk می‌کند، هر chunk را تعبیه و
    در VectorStore ذخیره می‌کند (با پاک‌سازی chunkهای قبلی برای idempotency).
  - ``search`` : متن پرس‌وجو را تعبیه و شبیه‌ترین قطعات را برمی‌گرداند.

این سرویس زیربنای RAG (لایه ۱۳) است؛ آنجا نتایج ``search`` به context تزریق
می‌شوند. embedding و vector store هر دو پشت Port تزریق می‌شوند (جایگزین‌پذیری).
"""
from __future__ import annotations

from uuid import UUID

from ...domain.entities.document_chunk import DocumentChunk
from ...shared.application.context import RequestContext
from ..ports.llm_provider import EmbeddingProvider
from ..ports.vector_store import VectorMatch, VectorRecord, VectorStore


class VectorSearchService:
    def __init__(
        self,
        *,
        vector_store: VectorStore,
        embedding_provider: EmbeddingProvider,
        chunker,
        default_top_k: int = 5,
    ) -> None:
        self._store = vector_store
        self._embedder = embedding_provider
        self._chunker = chunker
        self._default_top_k = default_top_k

    def index_attachment(
        self,
        *,
        attachment_id: UUID,
        text: str,
        ctx: RequestContext,
    ) -> int:
        """قطعه‌بندی + تعبیه + ذخیره. تعداد chunkهای ثبت‌شده را برمی‌گرداند.

        Idempotent: ابتدا chunkهای قبلی همان پیوست حذف می‌شوند تا ری‌ایندکس
        نتیجه‌ی تکراری/کهنه نسازد.
        """
        pieces = self._chunker.split(text)
        self._store.delete_by_attachment(
            tenant_id=ctx.tenant_id, attachment_id=attachment_id
        )
        if not pieces:
            return 0

        embeddings = self._embedder.embed(pieces)
        records: list[VectorRecord] = []
        for idx, (content, vector) in enumerate(zip(pieces, embeddings)):
            chunk = DocumentChunk.create(
                tenant_id=ctx.tenant_id,
                attachment_id=attachment_id,
                chunk_index=idx,
                content=content,
                token_count=len(content.split()),
            )
            records.append(
                VectorRecord(
                    chunk_id=chunk.id,
                    attachment_id=attachment_id,
                    chunk_index=idx,
                    content=content,
                    embedding=vector,
                )
            )
        self._store.upsert(tenant_id=ctx.tenant_id, records=records)
        return len(records)

    def search(
        self,
        *,
        query: str,
        ctx: RequestContext,
        top_k: int | None = None,
        attachment_ids: list[UUID] | None = None,
    ) -> list[VectorMatch]:
        query = (query or "").strip()
        if not query:
            return []
        embedding = self._embedder.embed([query])[0]
        return self._store.search(
            tenant_id=ctx.tenant_id,
            embedding=embedding,
            top_k=top_k or self._default_top_k,
            attachment_ids=attachment_ids,
        )
