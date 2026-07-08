"""MessageQueryService — مسیر خواندن پیام‌ها (سمت Query در CQRS).

بدون side-effect؛ صرفاً بارگذاری و نگاشت به DTO. جدا از مسیر نوشتن
(SendMessageService) نگه داشته شده تا در آینده به Read Replica هدایت شود.
"""
from __future__ import annotations

from uuid import UUID

from ...domain.repositories.message_repository import MessageRepository
from ...shared.application.context import RequestContext
from ...shared.domain.errors import NotFoundError
from ...shared.domain.pagination import Page
from ..dto.message_dto import MessageDTO


class MessageQueryService:
    def __init__(self, *, message_repo: MessageRepository) -> None:
        self._repo = message_repo

    def list_messages(
        self, conversation_id: UUID, ctx: RequestContext, *, cursor, limit, order="asc"
    ) -> Page[MessageDTO]:
        page = self._repo.list_by_conversation(
            conversation_id=conversation_id,
            tenant_id=ctx.tenant_id,
            cursor=cursor,
            limit=limit,
            order=order,
        )
        return Page(
            items=[MessageDTO.from_entity(m) for m in page.items],
            next_cursor=page.next_cursor,
            has_more=page.has_more,
            limit=page.limit,
        )

    def get_message(self, message_id: UUID, ctx: RequestContext) -> MessageDTO:
        msg = self._repo.get(message_id, ctx.tenant_id)
        if msg is None:
            raise NotFoundError("پیام یافت نشد.")
        return MessageDTO.from_entity(msg)

    def get_thread(
        self, thread_root_id: UUID, ctx: RequestContext
    ) -> list[MessageDTO]:
        msgs = self._repo.get_thread(
            thread_root_id=thread_root_id, tenant_id=ctx.tenant_id
        )
        return [MessageDTO.from_entity(m) for m in msgs]
