"""پیاده‌سازی ConversationSummaryRepository با Django ORM."""
from __future__ import annotations

from uuid import UUID

from ....domain.entities.conversation_summary import ConversationSummary
from ....domain.repositories.conversation_summary_repository import (
    ConversationSummaryRepository,
)
from ..mappers import ConversationSummaryMapper
from ..models import ConversationSummaryModel


class DjangoConversationSummaryRepository(ConversationSummaryRepository):
    def get_latest(
        self, conversation_id: UUID, tenant_id: UUID
    ) -> ConversationSummary | None:
        row = (
            ConversationSummaryModel.objects.filter(
                conversation_id=conversation_id, tenant_id=tenant_id
            )
            .order_by("-up_to_seq")
            .first()
        )
        return ConversationSummaryMapper.to_entity(row) if row else None

    def save(self, summary: ConversationSummary) -> None:
        ConversationSummaryModel.objects.update_or_create(
            id=summary.id,
            defaults={
                "tenant_id": summary.tenant_id,
                "conversation_id": summary.conversation_id,
                "up_to_seq": summary.up_to_seq,
                "summary": summary.summary,
                "token_count": summary.token_count,
            },
        )
