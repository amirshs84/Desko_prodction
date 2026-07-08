"""RagService — بازیابی دانش مرتبط برای تزریق به context.

این سرویس پل میان «جست‌وجوی برداری» (لایه ۱۲) و «مدیریت context» (لایه ۸) است:
پرس‌وجوی کاربر → شبیه‌ترین قطعات پیوست → فهرست بلوک‌های متنی که
``ContextManager.build_request(..., retrieved_context=...)`` مصرف می‌کند.

آستانه‌ی ``min_score`` قطعات نامرتبط را فیلتر می‌کند تا context با نویز پر نشود
(کیفیت پاسخ و هزینه‌ی توکن). خروجی framework-agnostic (list[str]) است.
"""
from __future__ import annotations

from uuid import UUID

from ...shared.application.context import RequestContext
from .vector_search_service import VectorSearchService


class RagService:
    def __init__(
        self,
        *,
        vector_search: VectorSearchService,
        min_score: float = 0.0,
        max_blocks: int = 5,
    ) -> None:
        self._vectors = vector_search
        self._min_score = min_score
        self._max_blocks = max_blocks

    def retrieve_context(
        self,
        *,
        query: str,
        ctx: RequestContext,
        attachment_ids: list[UUID] | None = None,
        top_k: int | None = None,
    ) -> list[str]:
        matches = self._vectors.search(
            query=query,
            ctx=ctx,
            top_k=top_k or self._max_blocks,
            attachment_ids=attachment_ids,
        )
        blocks = [m.content for m in matches if m.score >= self._min_score]
        return blocks[: self._max_blocks]
