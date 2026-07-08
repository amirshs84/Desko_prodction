"""DTO خروجی پیوست."""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...domain.entities.attachment import Attachment


@dataclass(frozen=True)
class AttachmentDTO:
    id: UUID
    file_type: str
    size_bytes: int
    mime_type: str
    parse_status: str
    checksum_sha256: str
    is_ready_for_rag: bool

    @classmethod
    def from_entity(cls, a: Attachment) -> "AttachmentDTO":
        return cls(
            id=a.id,
            file_type=a.file_type.value,
            size_bytes=a.size_bytes,
            mime_type=a.mime_type,
            parse_status=a.parse_status.value,
            checksum_sha256=a.storage.checksum_sha256,
            is_ready_for_rag=a.is_ready_for_rag,
        )
