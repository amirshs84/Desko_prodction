"""AttachmentService — آپلود و مدیریت چرخه‌ی پردازش پیوست‌ها.

مسئولیت‌ها:
  1. اعتبارسنجی (اندازه و نوع فایل) — قبل از هر ذخیره‌سازی.
  2. deduplication با checksum SHA-256 در محدوده‌ی مستأجر (فایل تکراری دوباره
     ذخیره/پردازش نمی‌شود).
  3. ذخیره‌ی بایت‌ها در ObjectStorage و ثبت «مرجع» به‌عنوان Aggregate.
  4. گذارهای چرخه‌ی پردازش (UPLOADED→PARSING→PARSED→CHUNKED→EMBEDDED) که در
     لایه‌های RAG/Celery توسط worker فراخوانی می‌شوند.

پردازش سنگین (استخراج متن، chunking، embedding) اینجا انجام نمی‌شود؛ فقط چرخه‌ی
وضعیت مدیریت می‌شود تا این سرویس سبک و framework-agnostic بماند.
"""
from __future__ import annotations

import hashlib
from typing import Callable
from uuid import UUID

from ...domain.entities.attachment import Attachment
from ...domain.enums import ParseStatus
from ...domain.file_rules import resolve_file_type
from ...domain.repositories.attachment_repository import AttachmentRepository
from ...domain.value_objects.storage_ref import StorageRef
from ...shared.application.context import RequestContext
from ...shared.domain.errors import NotFoundError, ValidationError
from ...shared.infrastructure.ids import uuid7
from ..commands.attachment_commands import UploadAttachmentCommand
from ..dto.attachment_dto import AttachmentDTO
from ..ports.object_storage import ObjectStorage
from ..ports.unit_of_work import UnitOfWork


class AttachmentService:
    def __init__(
        self,
        *,
        attachment_repo: AttachmentRepository,
        storage: ObjectStorage,
        uow_factory: Callable[[], UnitOfWork],
        bucket: str = "attachments",
        max_size_bytes: int = 25 * 1024 * 1024,
    ) -> None:
        self._repo = attachment_repo
        self._storage = storage
        self._uow_factory = uow_factory
        self._bucket = bucket
        self._max_size = max_size_bytes

    def upload(
        self, cmd: UploadAttachmentCommand, ctx: RequestContext
    ) -> AttachmentDTO:
        size = len(cmd.data)
        if size == 0:
            raise ValidationError("فایل خالی است.")
        if size > self._max_size:
            raise ValidationError(
                "حجم فایل از حد مجاز بیشتر است.",
                meta={"size": size, "max": self._max_size},
            )

        file_type = resolve_file_type(
            mime_type=cmd.content_type, filename=cmd.filename
        )
        checksum = hashlib.sha256(cmd.data).hexdigest()

        # deduplication: اگر همین فایل قبلاً در این مستأجر آپلود شده، دوباره
        # ذخیره/پردازش نمی‌کنیم و همان رکورد را برمی‌گردانیم.
        existing = self._repo.find_by_checksum(
            tenant_id=ctx.tenant_id, checksum_sha256=checksum
        )
        if existing is not None:
            return AttachmentDTO.from_entity(existing)

        key = f"{ctx.tenant_id}/{uuid7()}/{cmd.filename}"
        stored = self._storage.put(
            bucket=self._bucket,
            key=key,
            data=cmd.data,
            content_type=cmd.content_type,
        )

        attachment = Attachment(
            id=uuid7(),
            tenant_id=ctx.tenant_id,
            user_id=ctx.user_id,
            file_type=file_type,
            storage=StorageRef(
                bucket=stored.bucket, key=stored.key, checksum_sha256=checksum
            ),
            size_bytes=stored.size_bytes,
            mime_type=cmd.content_type,
        )
        with self._uow_factory():
            self._repo.add(attachment)
        return AttachmentDTO.from_entity(attachment)

    def get(self, attachment_id: UUID, ctx: RequestContext) -> AttachmentDTO:
        attachment = self._repo.get(attachment_id, ctx.tenant_id)
        if attachment is None:
            raise NotFoundError("پیوست یافت نشد.")
        return AttachmentDTO.from_entity(attachment)

    def advance(
        self,
        attachment_id: UUID,
        ctx: RequestContext,
        *,
        target: ParseStatus,
        extracted_text: str | None = None,
    ) -> AttachmentDTO:
        """گذار وضعیت پردازش (برای worker های RAG/ingestion)."""
        attachment = self._load(attachment_id, ctx)
        attachment.advance_to(target)  # domain: اعتبارسنجی گذار
        if extracted_text is not None:
            attachment.extracted_text = extracted_text
        with self._uow_factory():
            self._repo.update(attachment)
        return AttachmentDTO.from_entity(attachment)

    def fail(self, attachment_id: UUID, ctx: RequestContext, *, reason: str) -> None:
        attachment = self._load(attachment_id, ctx)
        attachment.mark_failed(reason)
        with self._uow_factory():
            self._repo.update(attachment)

    # ---------- کمکی‌ها ----------

    def _load(self, attachment_id: UUID, ctx: RequestContext) -> Attachment:
        attachment = self._repo.get(attachment_id, ctx.tenant_id)
        if attachment is None:
            raise NotFoundError("پیوست یافت نشد.")
        return attachment
