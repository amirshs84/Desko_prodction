"""قرارداد Repository پیام (Port خروجی دامنه)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from ...shared.domain.pagination import Page
from ..entities.message import Message


class MessageRepository(ABC):
    @abstractmethod
    def add(self, message: Message) -> None: ...

    @abstractmethod
    def get(self, message_id: UUID, tenant_id: UUID) -> Message | None: ...

    @abstractmethod
    def update(self, message: Message, *, expected_version: int | None = None) -> None:
        """ذخیره‌ی تغییرات پیام و نسخه‌های آن.

        ``expected_version`` برای قفل خوش‌بینانه‌ی ویرایش‌های همزمان؛ در مسیر
        استریمِ worker می‌تواند None باشد (تک‌نویسنده).
        """

    @abstractmethod
    def delete(
        self, message_id: UUID, tenant_id: UUID, *, expected_version: int
    ) -> None:
        """حذف نرم پیام با قفل خوش‌بینانه.

        رکورد فیزیکی و نسخه‌هایش حفظ می‌شوند (ممیزی/بازیابی و پایداری seq)؛ فقط
        ``deleted_at`` پر می‌شود. عدم تطابق نسخه → ConcurrencyConflictError.
        """

    @abstractmethod
    def next_seq(self, conversation_id: UUID, tenant_id: UUID) -> int:
        """شماره‌ی ترتیبی بعدی پیام در مکالمه (monotonic, بدون تکرار)."""

    @abstractmethod
    def list_by_conversation(
        self,
        *,
        conversation_id: UUID,
        tenant_id: UUID,
        cursor: str | None,
        limit: int,
        order: str = "asc",
    ) -> Page[Message]: ...

    @abstractmethod
    def get_thread(self, *, thread_root_id: UUID, tenant_id: UUID) -> list[Message]: ...

    @abstractmethod
    def list_recent(
        self, conversation_id: UUID, tenant_id: UUID, *, limit: int
    ) -> list[Message]:
        """پیام‌های اخیر مکالمه به‌ترتیب نزولی seq (جدیدترین اول).

        برای بودجه‌بندی context استفاده می‌شود (از تازه‌ترین به قدیمی‌تر تا پر
        شدن بودجه). خلاصه‌سازی پیام‌های قدیمی‌تر را پوشش می‌دهد.
        """
