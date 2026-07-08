"""ConversationService — Use-Caseهای مدیریت مکالمه.

منطق کسب‌وکار در Aggregate است؛ این سرویس فقط orchestration انجام می‌دهد:
بارگذاری، فراخوانی رفتار دامنه، ذخیره در مرز تراکنش (UoW)، و انتشار رویداد.
"""
from __future__ import annotations

from typing import Callable
from uuid import UUID

from ...domain.entities.conversation import Conversation
from ...domain.repositories.ai_model_repository import AIModelRepository
from ...domain.repositories.conversation_repository import (
    ConversationFilter,
    ConversationRepository,
)
from ...domain.value_objects.model_config import ModelConfig
from ...shared.application.context import RequestContext
from ...shared.domain.errors import NotFoundError, ValidationError
from ...shared.domain.pagination import Page
from ..commands.conversation_commands import (
    ChangeModelCommand,
    CreateConversationCommand,
    MutateConversationCommand,
    RenameConversationCommand,
)
from ..dto.conversation_dto import ConversationDTO
from ..ports.unit_of_work import UnitOfWork


class ConversationService:
    def __init__(
        self,
        *,
        conversation_repo: ConversationRepository,
        model_repo: AIModelRepository,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._repo = conversation_repo
        self._models = model_repo
        self._uow_factory = uow_factory

    def create(
        self, cmd: CreateConversationCommand, ctx: RequestContext
    ) -> ConversationDTO:
        model = self._models.get(cmd.model_id)
        if model is None or not model.is_active:
            raise ValidationError("مدل انتخاب‌شده در دسترس نیست.")
        config = ModelConfig(
            model_id=cmd.model_id,
            temperature=cmd.temperature,
            top_p=cmd.top_p,
            max_output_tokens=cmd.max_output_tokens,
        )
        conversation = Conversation.start(
            tenant_id=ctx.tenant_id,
            user_id=ctx.user_id,
            model_config=config,
            title=cmd.title,
        )
        with self._uow_factory() as uow:
            self._repo.add(conversation)
            uow.collect_events(conversation)
        return ConversationDTO.from_entity(conversation)

    def rename(
        self, cmd: RenameConversationCommand, ctx: RequestContext
    ) -> ConversationDTO:
        return self._mutate(
            cmd.conversation_id,
            cmd.expected_version,
            ctx,
            lambda c: c.rename(cmd.title),
        )

    def toggle_pin(
        self, cmd: MutateConversationCommand, ctx: RequestContext
    ) -> ConversationDTO:
        return self._mutate(
            cmd.conversation_id, cmd.expected_version, ctx, lambda c: c.toggle_pin()
        )

    def toggle_favorite(
        self, cmd: MutateConversationCommand, ctx: RequestContext
    ) -> ConversationDTO:
        return self._mutate(
            cmd.conversation_id,
            cmd.expected_version,
            ctx,
            lambda c: c.toggle_favorite(),
        )

    def archive(
        self, cmd: MutateConversationCommand, ctx: RequestContext
    ) -> ConversationDTO:
        return self._mutate(
            cmd.conversation_id, cmd.expected_version, ctx, lambda c: c.archive()
        )

    def unarchive(
        self, cmd: MutateConversationCommand, ctx: RequestContext
    ) -> ConversationDTO:
        return self._mutate(
            cmd.conversation_id, cmd.expected_version, ctx, lambda c: c.unarchive()
        )

    def change_model(
        self, cmd: ChangeModelCommand, ctx: RequestContext
    ) -> ConversationDTO:
        model = self._models.get(cmd.model_id)
        if model is None or not model.is_active:
            raise ValidationError("مدل انتخاب‌شده در دسترس نیست.")
        return self._mutate(
            cmd.conversation_id,
            cmd.expected_version,
            ctx,
            lambda c: c.change_model(cmd.model_id),
        )

    def delete(self, cmd: MutateConversationCommand, ctx: RequestContext) -> None:
        # ابتدا وجود را تأیید می‌کنیم تا «یافت‌نشد» از «تعارض نسخه» تفکیک شود.
        conversation = self._repo.get(cmd.conversation_id, ctx.tenant_id)
        if conversation is None:
            raise NotFoundError("مکالمه یافت نشد.")
        conversation.mark_deleted()  # اعتبارسنجی دامنه + وضعیت DELETED
        with self._uow_factory() as uow:
            self._repo.delete(
                cmd.conversation_id,
                ctx.tenant_id,
                expected_version=cmd.expected_version,
            )
            uow.collect_events(conversation)

    def get(self, conversation_id: UUID, ctx: RequestContext) -> ConversationDTO:
        conversation = self._repo.get(conversation_id, ctx.tenant_id)
        if conversation is None:
            raise NotFoundError("مکالمه یافت نشد.")
        return ConversationDTO.from_entity(conversation)

    def list(
        self, filters: ConversationFilter, ctx: RequestContext, *, cursor, limit
    ) -> Page[ConversationDTO]:
        page = self._repo.list_for_user(
            tenant_id=ctx.tenant_id,
            user_id=ctx.user_id,
            filters=filters,
            cursor=cursor,
            limit=limit,
        )
        return Page(
            items=[ConversationDTO.from_entity(c) for c in page.items],
            next_cursor=page.next_cursor,
            has_more=page.has_more,
            limit=page.limit,
        )

    # ---------- کمکی مشترک ----------

    def _mutate(self, conversation_id, expected_version, ctx, mutation):
        conversation = self._repo.get(conversation_id, ctx.tenant_id)
        if conversation is None:
            raise NotFoundError("مکالمه یافت نشد.")
        mutation(conversation)
        with self._uow_factory() as uow:
            self._repo.update(conversation, expected_version=expected_version)
            uow.collect_events(conversation)
        # نسخه‌ی محلی را با نسخه‌ی جدید DB هم‌راستا می‌کنیم تا DTO درست باشد.
        conversation.version = expected_version + 1
        return ConversationDTO.from_entity(conversation)
