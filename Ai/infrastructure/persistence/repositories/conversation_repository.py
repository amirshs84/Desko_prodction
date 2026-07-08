"""پیاده‌سازی ConversationRepository با Django ORM."""
from __future__ import annotations

from uuid import UUID

from django.utils import timezone

from ....domain.entities.conversation import Conversation
from ....domain.repositories.conversation_repository import (
    ConversationFilter,
    ConversationRepository,
)
from ....shared.domain.errors import ConcurrencyConflictError
from ....shared.domain.pagination import Page
from ..keyset import build_cursor, parse_cursor
from ..mappers import ConversationMapper
from ..models import ConversationModel


class DjangoConversationRepository(ConversationRepository):
    def add(self, conversation: Conversation) -> None:
        row = ConversationModel(id=conversation.id)
        ConversationMapper.apply_to_row(conversation, row)
        row.version = 1
        row.save(force_insert=True)

    def get(self, conversation_id: UUID, tenant_id: UUID) -> Conversation | None:
        row = ConversationModel.objects.filter(
            id=conversation_id, tenant_id=tenant_id
        ).first()
        return ConversationMapper.to_entity(row) if row else None

    def update(self, conversation: Conversation, *, expected_version: int) -> None:
        # قفل خوش‌بینانه: به‌روزرسانی فقط اگر نسخه با آنچه کلاینت خوانده مطابقت
        # داشته باشد. رد نشدن هیچ ردیفی یعنی تعارض همزمانی.
        updated = ConversationModel.objects.filter(
            id=conversation.id,
            tenant_id=conversation.tenant_id,
            version=expected_version,
        ).update(
            title=conversation.title,
            status=conversation.status.value,
            is_pinned=conversation.flags.is_pinned,
            is_favorite=conversation.flags.is_favorite,
            model_id=conversation.model_config.model_id,
            temperature=conversation.model_config.temperature,
            top_p=conversation.model_config.top_p,
            max_output_tokens=conversation.model_config.max_output_tokens,
            version=expected_version + 1,
        )
        if updated == 0:
            raise ConcurrencyConflictError()

    def delete(
        self, conversation_id: UUID, tenant_id: UUID, *, expected_version: int
    ) -> None:
        # حذف نرم اتمیک + قفل خوش‌بینانه در یک UPDATE. فیلتر روی مدیر پیش‌فرض
        # ``objects`` است که رکوردهای حذف‌شده را نمی‌بیند؛ پس حذف دوباره هم
        # به‌درستی به‌عنوان «یافت‌نشد/تعارض» رفتار می‌کند.
        updated = ConversationModel.objects.filter(
            id=conversation_id, tenant_id=tenant_id, version=expected_version
        ).update(
            status="deleted",
            deleted_at=timezone.now(),
            version=expected_version + 1,
        )
        if updated == 0:
            raise ConcurrencyConflictError()

    def list_for_user(
        self,
        *,
        tenant_id: UUID,
        user_id: UUID,
        filters: ConversationFilter,
        cursor: str | None,
        limit: int,
    ) -> Page[Conversation]:
        qs = ConversationModel.objects.filter(tenant_id=tenant_id, user_id=user_id)
        if not filters.include_archived:
            qs = qs.exclude(status="archived")
        if filters.pinned_only:
            qs = qs.filter(is_pinned=True)
        if filters.favorite_only:
            qs = qs.filter(is_favorite=True)
        if filters.search:
            # روی SQLite جستجوی ساده؛ FTS (tsvector/GIN) در لایه‌ی Search روی
            # Postgres جایگزین می‌شود (پشت همین قرارداد).
            qs = qs.filter(title__icontains=filters.search)

        # Keyset پایدار روی id (چون UUIDv7 زمان‌مرتب است → جدیدترین‌ها اول).
        parsed = parse_cursor(cursor)
        if parsed is not None:
            _, last_id = parsed
            qs = qs.filter(id__lt=last_id)
        qs = qs.order_by("-id")

        rows = list(qs[: limit + 1])
        has_more = len(rows) > limit
        rows = rows[:limit]
        items = [ConversationMapper.to_entity(r) for r in rows]
        next_cursor = (
            build_cursor(sort_value=None, last_id=str(rows[-1].id))
            if has_more and rows
            else None
        )
        return Page(items=items, next_cursor=next_cursor, has_more=has_more, limit=limit)
