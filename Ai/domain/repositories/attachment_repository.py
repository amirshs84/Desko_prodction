"""قرارداد Repository پیوست (Port خروجی دامنه)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from ..entities.attachment import Attachment


class AttachmentRepository(ABC):
    @abstractmethod
    def add(self, attachment: Attachment) -> None: ...

    @abstractmethod
    def get(self, attachment_id: UUID, tenant_id: UUID) -> Attachment | None: ...

    @abstractmethod
    def update(self, attachment: Attachment) -> None: ...

    @abstractmethod
    def find_by_checksum(
        self, *, tenant_id: UUID, checksum_sha256: str
    ) -> Attachment | None:
        """برای deduplication: اگر همان فایل قبلاً پردازش شده باشد."""
