"""SendMessageService — بخش همگام ارسال پیام.

مسئولیت‌ها (سریع و تراکنشی):
  1. اعتبارسنجی مکالمه و invariant «پذیرش پیام».
  2. idempotency (جلوگیری از پیام تکراری در retry شبکه).
  3. کنترل سهمیه‌ی روزانه.
  4. ذخیره‌ی پیام کاربر (نهایی) + پیام دستیار (PENDING) در یک تراکنش.
  5. زمان‌بندی تولید پاسخ روی صف (async) — پس از commit.

تولید واقعی پاسخ (فراخوانی Provider و استریم) در worker پس‌زمینه انجام می‌شود
(لایه‌های ۷/۸/۱۶). این تفکیک، ظرفیت هم‌زمانی web را حفظ می‌کند.
"""
from __future__ import annotations

from typing import Callable
from uuid import UUID

from ...domain.entities.message import Message
from ...domain.repositories.conversation_repository import ConversationRepository
from ...domain.repositories.message_repository import MessageRepository
from ...shared.application.context import RequestContext
from ...shared.domain.errors import ConflictError, NotFoundError
from ..commands.message_commands import SendMessageCommand
from ..dto.message_dto import MessageDTO, SendMessageResult
from ..ports.cache import CacheClient
from ..ports.generation_queue import GenerationQueue
from ..ports.unit_of_work import UnitOfWork
from .quota_service import QuotaService

_IDEMPOTENCY_TTL = 3600  # یک ساعت


class SendMessageService:
    def __init__(
        self,
        *,
        conversation_repo: ConversationRepository,
        message_repo: MessageRepository,
        quota_service: QuotaService,
        generation_queue: GenerationQueue,
        cache: CacheClient,
        cache_keys,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._conversations = conversation_repo
        self._messages = message_repo
        self._quota = quota_service
        self._queue = generation_queue
        self._cache = cache
        self._keys = cache_keys
        self._uow_factory = uow_factory

    def execute(
        self, cmd: SendMessageCommand, ctx: RequestContext
    ) -> SendMessageResult:
        conversation = self._conversations.get(cmd.conversation_id, ctx.tenant_id)
        if conversation is None:
            raise NotFoundError("مکالمه یافت نشد.")
        conversation.ensure_can_accept_message()

        self._guard_idempotency(cmd, ctx)
        self._quota.check_and_consume(tenant_id=ctx.tenant_id, user_id=ctx.user_id)

        thread_root_id = self._resolve_thread_root(cmd.parent_id, ctx)

        with self._uow_factory() as uow:
            seq = self._messages.next_seq(conversation.id, ctx.tenant_id)
            user_msg = Message.create_user_message(
                tenant_id=ctx.tenant_id,
                conversation_id=conversation.id,
                seq=seq,
                content=cmd.content,
                parent_id=cmd.parent_id,
                quoted_message_id=cmd.quoted_message_id,
                thread_root_id=thread_root_id,
            )
            self._messages.add(user_msg)

            assistant = Message.create_assistant_placeholder(
                tenant_id=ctx.tenant_id,
                conversation_id=conversation.id,
                seq=seq + 1,
                parent_id=user_msg.id,
                model_id=conversation.model_config.model_id,
                thread_root_id=user_msg.thread_root_id or user_msg.id,
            )
            self._messages.add(assistant)

            uow.collect_events(user_msg)
            uow.collect_events(assistant)

        # فقط پس از commit موفق، تولید را زمان‌بندی می‌کنیم (اجتناب از task یتیم).
        self._queue.enqueue_generation(message_id=assistant.id, context=ctx)

        return SendMessageResult(
            user_message=MessageDTO.from_entity(user_msg),
            assistant_message=MessageDTO.from_entity(assistant),
        )

    # ---------- کمکی‌ها ----------

    def _guard_idempotency(
        self, cmd: SendMessageCommand, ctx: RequestContext
    ) -> None:
        if not cmd.idempotency_key:
            return
        key = self._keys.idempotency(ctx.tenant_id, cmd.idempotency_key)
        # add اتمیک: اگر از قبل باشد یعنی همین درخواست قبلاً پردازش شده.
        if not self._cache.add(key, "1", ttl_seconds=_IDEMPOTENCY_TTL):
            raise ConflictError("این درخواست قبلاً ثبت شده است.")

    def _resolve_thread_root(
        self, parent_id: UUID | None, ctx: RequestContext
    ) -> UUID | None:
        if parent_id is None:
            return None
        parent = self._messages.get(parent_id, ctx.tenant_id)
        if parent is None:
            raise NotFoundError("پیام والد یافت نشد.")
        # ریشه‌ی thread والد را به ارث می‌بریم؛ اگر والد خودش ریشه است، id آن.
        return parent.thread_root_id or parent.id
