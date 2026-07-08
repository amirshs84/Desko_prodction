"""AttachmentIngestionService — pipeline آماده‌سازی پیوست برای RAG.

مسیر کامل: خواندن بایت‌ها از storage → استخراج متن → chunk + embed + upsert در
VectorStore → پیشبرد وضعیت پیوست تا EMBEDDED. هر خطا پیوست را به FAILED می‌برد
(با ثبت دلیل) تا قابل تلاش مجدد باشد.

این کار I/O-bound و کند است، پس در prod توسط worker (لایه ۱۶) صدا زده می‌شود؛
اما منطق آن اینجا و framework-agnostic است تا مستقل تست شود.
"""
from __future__ import annotations

from typing import Callable
from uuid import UUID

from ...domain.entities.attachment import Attachment
from ...domain.enums import ParseStatus
from ...shared.application.context import RequestContext
from ...shared.domain.errors import DomainError, NotFoundError
from ..ports.object_storage import ObjectStorage
from ..ports.text_extractor import TextExtractor
from ..ports.unit_of_work import UnitOfWork
from .vector_search_service import VectorSearchService


class AttachmentIngestionService:
    def __init__(
        self,
        *,
        attachment_repo,
        storage: ObjectStorage,
        extractor: TextExtractor,
        vector_search: VectorSearchService,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._repo = attachment_repo
        self._storage = storage
        self._extractor = extractor
        self._vectors = vector_search
        self._uow_factory = uow_factory

    def ingest(self, attachment_id: UUID, ctx: RequestContext) -> int:
        """پیوست را پردازش و ایندکس می‌کند؛ تعداد chunkها را برمی‌گرداند."""
        attachment = self._repo.get(attachment_id, ctx.tenant_id)
        if attachment is None:
            raise NotFoundError("پیوست یافت نشد.")

        try:
            return self._run(attachment, ctx)
        except DomainError:
            self._fail(attachment, "خطای پردازش پیوست.")
            raise
        except Exception as exc:  # noqa: BLE001 — هر خطای غیرمنتظره → FAILED
            self._fail(attachment, str(exc)[:500])
            raise

    # ---------- مراحل ----------

    def _run(self, attachment: Attachment, ctx: RequestContext) -> int:
        attachment.advance_to(ParseStatus.PARSING)
        self._persist(attachment)

        data = self._storage.get(
            bucket=attachment.storage.bucket, key=attachment.storage.key
        )
        text = self._extractor.extract(
            file_type=attachment.file_type,
            data=data,
            mime_type=attachment.mime_type,
            filename=attachment.storage.key,
        )

        attachment.advance_to(ParseStatus.PARSED)
        attachment.extracted_text = text
        self._persist(attachment)

        attachment.advance_to(ParseStatus.CHUNKED)
        self._persist(attachment)

        count = self._vectors.index_attachment(
            attachment_id=attachment.id, text=text, ctx=ctx
        )

        attachment.advance_to(ParseStatus.EMBEDDED)
        self._persist(attachment)
        return count

    def _persist(self, attachment: Attachment) -> None:
        with self._uow_factory():
            self._repo.update(attachment)

    def _fail(self, attachment: Attachment, reason: str) -> None:
        attachment.mark_failed(reason)
        with self._uow_factory():
            self._repo.update(attachment)
