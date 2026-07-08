"""Attachment — پیوست فایل (Aggregate Root).

فایل خام در Object Storage است؛ این Aggregate «مرجع» و چرخه‌ی پردازش آن را
مدیریت می‌کند تا برای درک توسط هوش مصنوعی (RAG) آماده شود.

State Machine پردازش:
    UPLOADED → PARSING → PARSED → CHUNKED → EMBEDDED
    (هر مرحله می‌تواند به FAILED برود)
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...shared.domain.entity import AggregateRoot
from ...shared.domain.errors import InvalidStateError
from ..enums import FileType, ParseStatus
from ..value_objects.storage_ref import StorageRef

_PARSE_FLOW: dict[ParseStatus, set[ParseStatus]] = {
    ParseStatus.UPLOADED: {ParseStatus.PARSING, ParseStatus.FAILED},
    ParseStatus.PARSING: {ParseStatus.PARSED, ParseStatus.FAILED},
    ParseStatus.PARSED: {ParseStatus.CHUNKED, ParseStatus.FAILED},
    ParseStatus.CHUNKED: {ParseStatus.EMBEDDED, ParseStatus.FAILED},
    ParseStatus.EMBEDDED: set(),
    ParseStatus.FAILED: {ParseStatus.PARSING},  # امکان تلاش مجدد پردازش
}


@dataclass(eq=False)
class Attachment(AggregateRoot):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    file_type: FileType
    storage: StorageRef
    size_bytes: int
    mime_type: str
    parse_status: ParseStatus = ParseStatus.UPLOADED
    extracted_text: str | None = None
    failure_reason: str | None = None

    def advance_to(self, target: ParseStatus) -> None:
        allowed = _PARSE_FLOW.get(self.parse_status, set())
        if target not in allowed:
            raise InvalidStateError(
                f"گذار پردازش از «{self.parse_status.value}» به «{target.value}» مجاز نیست."
            )
        self.parse_status = target

    def mark_failed(self, reason: str) -> None:
        self.parse_status = ParseStatus.FAILED
        self.failure_reason = reason

    @property
    def is_ready_for_rag(self) -> bool:
        return self.parse_status is ParseStatus.EMBEDDED
