"""MessageService — Use-Caseهای نوشتنِ پیام (به‌جز ارسال اولیه).

پوشش فیچرها: Edit، Delete، Retry، Regenerate. ارسال پیام جدید در
``SendMessageService`` است و خواندن‌ها در ``MessageQueryService`` (تفکیک CQRS).

الگو: بارگذاری Aggregate → فراخوانی رفتار دامنه (که invariantها را اجرا می‌کند)
→ ذخیره در مرز تراکنش با قفل خوش‌بینانه → (برای retry/regenerate) زمان‌بندی تولید
روی صف، فقط پس از commit موفق تا task یتیم نسازیم.
"""
from __future__ import annotations

from typing import Callable
from uuid import UUID

from ...domain.entities.message import Message
from ...domain.repositories.message_repository import MessageRepository
from ...shared.application.context import RequestContext
from ...shared.domain.errors import NotFoundError
from ..commands.message_commands import EditMessageCommand, MutateMessageCommand
from ..dto.message_dto import MessageDTO
from ..ports.generation_queue import GenerationQueue
from ..ports.unit_of_work import UnitOfWork


class MessageService:
    def __init__(
        self,
        *,
        message_repo: MessageRepository,
        generation_queue: GenerationQueue,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._messages = message_repo
        self._queue = generation_queue
        self._uow_factory = uow_factory

    def edit(self, cmd: EditMessageCommand, ctx: RequestContext) -> MessageDTO:
        msg = self._load(cmd.message_id, ctx)
        msg.edit(cmd.new_content)  # domain: فقط پیام کاربر، نسخه‌ی جدید
        self._save(msg, cmd.expected_version)
        return MessageDTO.from_entity(msg)

    def delete(self, cmd: MutateMessageCommand, ctx: RequestContext) -> None:
        # تأیید وجود تا «یافت‌نشد» از «تعارض نسخه» تفکیک شود.
        if self._messages.get(cmd.message_id, ctx.tenant_id) is None:
            raise NotFoundError("پیام یافت نشد.")
        with self._uow_factory():
            self._messages.delete(
                cmd.message_id, ctx.tenant_id, expected_version=cmd.expected_version
            )

    def retry(self, cmd: MutateMessageCommand, ctx: RequestContext) -> MessageDTO:
        msg = self._load(cmd.message_id, ctx)
        msg.retry()  # domain: FAILED/CANCELLED → PENDING (فقط دستیار)
        self._save(msg, cmd.expected_version)
        self._queue.enqueue_generation(message_id=msg.id, context=ctx)
        return MessageDTO.from_entity(msg)

    def regenerate(self, cmd: MutateMessageCommand, ctx: RequestContext) -> MessageDTO:
        msg = self._load(cmd.message_id, ctx)
        msg.regenerate()  # domain: COMPLETED → PENDING (فقط دستیار)
        self._save(msg, cmd.expected_version)
        self._queue.enqueue_generation(message_id=msg.id, context=ctx)
        return MessageDTO.from_entity(msg)

    # ---------- کمکی‌ها ----------

    def _load(self, message_id: UUID, ctx: RequestContext) -> Message:
        msg = self._messages.get(message_id, ctx.tenant_id)
        if msg is None:
            raise NotFoundError("پیام یافت نشد.")
        return msg

    def _save(self, msg: Message, expected_version: int) -> None:
        with self._uow_factory() as uow:
            self._messages.update(msg, expected_version=expected_version)
            uow.collect_events(msg)
        # هم‌راستاسازی نسخه‌ی محلی با DB برای درستیِ DTO خروجی.
        msg.version = expected_version + 1
