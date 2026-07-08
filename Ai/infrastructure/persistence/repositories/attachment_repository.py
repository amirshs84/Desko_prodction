"""پیاده‌سازی AttachmentRepository با Django ORM."""
from __future__ import annotations

from uuid import UUID

from ....domain.entities.attachment import Attachment
from ....domain.repositories.attachment_repository import AttachmentRepository
from ..mappers import AttachmentMapper
from ..models import AttachmentModel


class DjangoAttachmentRepository(AttachmentRepository):
    def add(self, attachment: Attachment) -> None:
        row = AttachmentModel(id=attachment.id)
        AttachmentMapper.apply_to_row(attachment, row)
        row.save(force_insert=True)

    def get(self, attachment_id: UUID, tenant_id: UUID) -> Attachment | None:
        row = AttachmentModel.objects.filter(
            id=attachment_id, tenant_id=tenant_id
        ).first()
        return AttachmentMapper.to_entity(row) if row else None

    def update(self, attachment: Attachment) -> None:
        row = AttachmentModel.objects.filter(
            id=attachment.id, tenant_id=attachment.tenant_id
        ).first()
        if row is None:
            return
        AttachmentMapper.apply_to_row(attachment, row)
        row.save()

    def find_by_checksum(
        self, *, tenant_id: UUID, checksum_sha256: str
    ) -> Attachment | None:
        row = AttachmentModel.objects.filter(
            tenant_id=tenant_id, checksum_sha256=checksum_sha256
        ).first()
        return AttachmentMapper.to_entity(row) if row else None
