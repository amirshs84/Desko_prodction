"""GenerationService — تولید پاسخ دستیار به‌صورت استریم (هسته‌ی SSE).

جریان:
    ۱) بارگذاری پیام دستیارِ PENDING + مکالمه + مدل (اعتبارسنجی زودهنگام).
    ۲) مونتاژ GenerationRequest با ContextManager (بودجه‌بندی + system prompt نقش).
    ۳) گرفتن آداپتور Provider از Factory و استریم قطعه‌قطعه‌ی خروجی.
    ۴) هر delta به‌صورت رویداد ``token`` yield می‌شود؛ در پایان، پیام با محتوای
       کامل و مصرف توکن ``complete`` و در یک تراکنش ذخیره می‌شود.
    ۵) در صورت خطا، پیام ``fail`` شده و رویداد ``error`` منتشر می‌شود.

چرا اعتبارسنجی جدا از generator؟ تا خطاهای «یافت‌نشد/وضعیت نامعتبر» پیش از شروع
استریم رخ دهند و لایه‌ی REST بتواند کد وضعیت HTTP درست بدهد (بعد از شروع استریم،
هدرها ارسال شده و دیگر نمی‌توان وضعیت را تغییر داد؛ آنجا فقط رویداد error می‌ماند).

نکته‌ی همزمانی: هر پیام دستیار «تک‌نویسنده» است (فقط یک تولید فعال)، پس ذخیره‌ی
میانی/نهایی با ``expected_version=None`` انجام می‌شود؛ نیازی به قفل خوش‌بینانه
نیست و از افزایش نسخه‌ی پرهزینه در هر chunk پرهیز می‌شود.
"""
from __future__ import annotations

from typing import Callable, Iterator
from uuid import UUID

from ...domain.entities.message import Message
from ...domain.enums import MessageStatus, Role
from ...domain.repositories.ai_model_repository import AIModelRepository
from ...domain.repositories.conversation_repository import ConversationRepository
from ...domain.repositories.message_repository import MessageRepository
from ...domain.value_objects.token_usage import TokenUsage
from ...shared.application.context import RequestContext
from ...shared.domain.errors import InvalidStateError, NotFoundError
from ..ports.provider_factory import LLMProviderFactory
from ..ports.stream_transport import StreamEvent
from ..ports.unit_of_work import UnitOfWork
from .context_manager import ContextManager

__all__ = ["GenerationService", "StreamEvent"]


class GenerationService:
    def __init__(
        self,
        *,
        conversation_repo: ConversationRepository,
        message_repo: MessageRepository,
        model_repo: AIModelRepository,
        context_manager: ContextManager,
        provider_factory: LLMProviderFactory,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._conversations = conversation_repo
        self._messages = message_repo
        self._models = model_repo
        self._context = context_manager
        self._factory = provider_factory
        self._uow_factory = uow_factory

    def generate(
        self, message_id: UUID, ctx: RequestContext
    ) -> Iterator[StreamEvent]:
        """اعتبارسنجی زودهنگام و سپس بازگرداندن generator استریم.

        چون این متد خودش generator نیست، بدنه بلافاصله اجرا می‌شود و خطاهای
        اعتبارسنجی پیش از هر خروجی پرتاب می‌شوند.
        """
        message = self._messages.get(message_id, ctx.tenant_id)
        if message is None:
            raise NotFoundError("پیام یافت نشد.")
        if message.role is not Role.ASSISTANT:
            raise InvalidStateError("فقط پاسخ دستیار قابل تولید است.")
        if message.status is not MessageStatus.PENDING:
            raise InvalidStateError("این پیام در وضعیت قابل تولید نیست.")

        conversation = self._conversations.get(message.conversation_id, ctx.tenant_id)
        if conversation is None:
            raise NotFoundError("مکالمه یافت نشد.")

        model = self._models.get(conversation.model_config.model_id)
        if model is None:
            raise NotFoundError("مدل انتخاب‌شده‌ی مکالمه یافت نشد.")

        request = self._context.build_request(conversation=conversation, ctx=ctx)
        provider = self._factory.create_chat_provider(model)
        return self._run(message, request, provider)

    def _run(self, message: Message, request, provider) -> Iterator[StreamEvent]:
        # علامت‌گذاری «در حال استریم» تا مشاهده‌گران دیگر وضعیت را ببینند.
        message.begin_streaming()
        with self._uow_factory():
            self._messages.update(message, expected_version=None)

        parts: list[str] = []
        usage = TokenUsage()
        try:
            for chunk in provider.generate(request):
                if chunk.delta:
                    parts.append(chunk.delta)
                    yield StreamEvent("token", {"delta": chunk.delta})
                if chunk.usage is not None:
                    usage = chunk.usage
        except Exception as exc:  # noqa: BLE001 — به رویداد error نگاشت می‌شود
            reason = getattr(exc, "message", None) or str(exc)
            self._mark_failed(message, reason)
            code = getattr(exc, "code", "INTERNAL_ERROR")
            yield StreamEvent("error", {"code": code, "message": reason})
            return

        content = "".join(parts).strip()
        message.complete(content=content, usage=usage, finish_reason="stop")
        with self._uow_factory() as uow:
            self._messages.update(message, expected_version=None)
            uow.collect_events(message)

        yield StreamEvent(
            "done",
            {
                "message_id": str(message.id),
                "usage": {
                    "prompt_tokens": usage.prompt_tokens,
                    "completion_tokens": usage.completion_tokens,
                    "total_tokens": usage.total_tokens,
                },
            },
        )

    def _mark_failed(self, message: Message, reason: str) -> None:
        try:
            message.fail(reason)
            with self._uow_factory() as uow:
                self._messages.update(message, expected_version=None)
                uow.collect_events(message)
        except Exception:  # noqa: BLE001 — شکست در ثبتِ شکست نباید استریم را بشکند
            pass
