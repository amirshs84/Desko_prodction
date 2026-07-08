"""قرارداد Repository خلاصه‌ی مکالمه (Port خروجی دامنه)."""
from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from ..entities.conversation_summary import ConversationSummary


class ConversationSummaryRepository(ABC):
    @abstractmethod
    def get_latest(
        self, conversation_id: UUID, tenant_id: UUID
    ) -> ConversationSummary | None:
        """آخرین (به‌روزترین) خلاصه‌ی مکالمه؛ None اگر هنوز خلاصه‌ای نیست."""

    @abstractmethod
    def save(self, summary: ConversationSummary) -> None: ...
