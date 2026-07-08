"""قرارداد Repository مکالمه (Port خروجی دامنه).

همه‌ی متدها ``tenant_id`` می‌گیرند تا ایزولاسیون Multi-Tenant در سطح «قرارداد»
اجباری شود — نه صرفاً یک قرارداد شفاهی. پیاده‌سازی (Django ORM) در لایه ۵.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID

from ...shared.domain.pagination import Page
from ..entities.conversation import Conversation


@dataclass(frozen=True)
class ConversationFilter:
    """پارامترهای فیلتر/جستجوی لیست مکالمات (Query DTO سطح دامنه)."""

    pinned_only: bool = False
    favorite_only: bool = False
    include_archived: bool = False
    search: str | None = None


class ConversationRepository(ABC):
    @abstractmethod
    def add(self, conversation: Conversation) -> None: ...

    @abstractmethod
    def get(self, conversation_id: UUID, tenant_id: UUID) -> Conversation | None: ...

    @abstractmethod
    def update(self, conversation: Conversation, *, expected_version: int) -> None:
        """به‌روزرسانی با قفل خوش‌بینانه.

        اگر نسخه‌ی فعلی با ``expected_version`` مطابقت نداشته باشد باید
        ConcurrencyConflictError پرتاب شود.
        """

    @abstractmethod
    def delete(
        self, conversation_id: UUID, tenant_id: UUID, *, expected_version: int
    ) -> None:
        """حذف نرم با قفل خوش‌بینانه.

        رکورد فیزیکی حذف نمی‌شود (برای بازیابی/ممیزی و حفظ درخت پیام‌ها)؛ فقط
        ``deleted_at`` پر می‌شود تا از کوئری‌های عادی خارج شود. عدم تطابق نسخه →
        ConcurrencyConflictError.
        """

    @abstractmethod
    def list_for_user(
        self,
        *,
        tenant_id: UUID,
        user_id: UUID,
        filters: ConversationFilter,
        cursor: str | None,
        limit: int,
    ) -> Page[Conversation]: ...
