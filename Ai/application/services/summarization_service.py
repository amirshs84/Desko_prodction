"""SummarizationService — ساخت/به‌روزرسانی خلاصه‌ی rolling مکالمه.

چرا؟ مکالمه‌های طولانی از پنجره‌ی context مدل فراتر می‌روند. به‌جای دور ریختن
تاریخچه، بخش قدیمی را به یک خلاصه‌ی فشرده تبدیل می‌کنیم که ContextManager آن را
به‌جای پیام‌های خام می‌فرستد.

استراتژی incremental (rolling):
    خلاصه‌ی قبلی + پیام‌های جدیدِ بعد از ``up_to_seq`` → خلاصه‌ی تازه.
    این‌گونه هر بار کل مکالمه دوباره خلاصه نمی‌شود (صرفه‌جویی توکن/هزینه).

این سرویس معمولاً توسط worker پس‌زمینه (لایه ۱۶) صدا زده می‌شود، نه در مسیر
درخواست کاربر — چون فراخوانی مدل کند است. اما منطق آن اینجا و framework-agnostic
است تا مستقل تست شود.

نکته‌ی امنیتی: خلاصه tenant-scoped است؛ همه‌ی خواندن/نوشتن با ``tenant_id`` از
context فیلتر می‌شود تا نشت بین مستأجرها رخ ندهد.
"""
from __future__ import annotations

from ...domain.entities.conversation import Conversation
from ...domain.entities.conversation_summary import ConversationSummary
from ...domain.enums import MessageStatus
from ...domain.repositories.ai_model_repository import AIModelRepository
from ...domain.repositories.conversation_summary_repository import (
    ConversationSummaryRepository,
)
from ...domain.repositories.message_repository import MessageRepository
from ...shared.application.context import RequestContext
from ...shared.domain.errors import NotFoundError
from ..ports.llm_provider import GenerationRequest, PromptMessage
from ..ports.provider_factory import LLMProviderFactory
from ..ports.token_counter import TokenCounter

_SUMMARY_SYSTEM_PROMPT = (
    "تو یک خلاصه‌ساز حرفه‌ای گفت‌وگو هستی. گفت‌وگوی زیر را کوتاه، دقیق و بدون "
    "قضاوت به فارسی خلاصه کن؛ نکات، تصمیم‌ها و اطلاعات کلیدی را حفظ کن و جزئیات "
    "بی‌اهمیت را حذف کن."
)


class SummarizationService:
    def __init__(
        self,
        *,
        message_repo: MessageRepository,
        summary_repo: ConversationSummaryRepository,
        model_repo: AIModelRepository,
        provider_factory: LLMProviderFactory,
        token_counter: TokenCounter,
        trigger_ratio: float = 0.6,
        scan_limit: int = 500,
    ) -> None:
        self._messages = message_repo
        self._summaries = summary_repo
        self._models = model_repo
        self._factory = provider_factory
        self._counter = token_counter
        self._trigger_ratio = trigger_ratio
        self._scan_limit = scan_limit

    def summarize_if_needed(
        self, *, conversation: Conversation, ctx: RequestContext
    ) -> ConversationSummary | None:
        """در صورت عبور تاریخچه‌ی جدید از آستانه، خلاصه را می‌سازد/به‌روز می‌کند.

        None برمی‌گرداند اگر هنوز نیازی به خلاصه‌سازی نباشد.
        """
        model = self._models.get(conversation.model_config.model_id)
        if model is None:
            raise NotFoundError("مدل انتخاب‌شده‌ی مکالمه یافت نشد.")

        previous = self._summaries.get_latest(conversation.id, ctx.tenant_id)
        from_seq = previous.up_to_seq if previous else 0

        # پیام‌های جدیدِ بعد از خلاصه‌ی قبلی (به ترتیب زمانی).
        recent_desc = self._messages.list_recent(
            conversation.id, ctx.tenant_id, limit=self._scan_limit
        )
        new_messages = [
            m
            for m in recent_desc
            if m.seq > from_seq and m.status is MessageStatus.COMPLETED
        ]
        new_messages.sort(key=lambda m: m.seq)
        if not new_messages:
            return None

        transcript_lines: list[str] = []
        for m in new_messages:
            version = m.active_version
            if version is None or not version.content:
                continue
            transcript_lines.append(f"{m.role.value}: {version.content}")
        transcript = "\n".join(transcript_lines)
        if not transcript:
            return None

        # آستانه: فقط وقتی دلتای جدید به‌قدر کافی بزرگ شد، مدل را صدا بزن.
        threshold = int(model.context_window * self._trigger_ratio)
        if self._counter.count(transcript) < threshold:
            return None

        prior = f"خلاصه‌ی پیشین:\n{previous.summary}\n\n" if previous else ""
        user_prompt = f"{prior}بخش جدید گفت‌وگو:\n{transcript}"

        provider = self._factory.create_chat_provider(model)
        request = GenerationRequest(
            model_key=model.key,
            messages=(PromptMessage(role="user", content=user_prompt),),
            system_prompt=_SUMMARY_SYSTEM_PROMPT,
            temperature=0.3,
            max_output_tokens=model.max_output_tokens,
        )
        text = "".join(chunk.delta for chunk in provider.generate(request)).strip()
        if not text:
            return None

        summary = ConversationSummary.create(
            tenant_id=ctx.tenant_id,
            conversation_id=conversation.id,
            up_to_seq=new_messages[-1].seq,
            summary=text,
            token_count=self._counter.count(text),
        )
        self._summaries.save(summary)
        return summary
