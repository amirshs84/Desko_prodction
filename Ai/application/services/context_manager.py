"""ContextManager — مونتاژ درخواست ارسالی به مدل از تاریخچه‌ی مکالمه.

مسئولیت (Single Responsibility): تبدیل «حالت مکالمه» به یک ``GenerationRequest``
آماده برای ChatProvider، با رعایت پنجره‌ی محدود context مدل. این منطق کاملاً
framework-agnostic است و به Django وابسته نیست.

استراتژی بودجه‌بندی (چرا این طراحی):
    پنجره‌ی context مدل محدود است. اگر همه‌ی تاریخچه را کورکورانه بفرستیم، یا
    خطای سرریز می‌گیریم یا هزینه‌ی توکن بی‌دلیل بالا می‌رود. پس:

        budget = context_window − max_output − safety_margin

    ترتیب اولویت پر کردن budget:
      ۱) system prompt نقش (بالاترین اولویت — همیشه باید بماند)
      ۲) دانش بازیابی‌شده‌ی RAG (اگر تزریق شده باشد)
      ۳) خلاصه‌ی گفت‌وگوی قدیمی (rolling summary)
      ۴) پیام‌های اخیر، از تازه‌ترین به قدیمی‌تر تا پر شدن budget

    پیام‌های اخیر به‌صورت نزولی برداشته و سپس معکوس می‌شوند تا ترتیب زمانی
    (chronological) برای مدل حفظ شود.

جایگزین‌ها:
  - «ارسال کل تاریخچه»: ساده اما ناپایدار و پرهزینه؛ رد شد.
  - «truncation کورکورانه‌ی ابتدای متن»: زمینه‌ی مهم را از دست می‌دهد؛ ما با
    summary این را جبران می‌کنیم.

پیچیدگی: O(n) روی پیام‌های اخیر اسکن‌شده (سقف ``context_recent_limit``).
"""
from __future__ import annotations

from ...domain.entities.conversation import Conversation
from ...domain.enums import MessageStatus, UserRole
from ...domain.repositories.ai_model_repository import AIModelRepository
from ...domain.repositories.conversation_summary_repository import (
    ConversationSummaryRepository,
)
from ...domain.repositories.message_repository import MessageRepository
from ...domain.repositories.role_prompt_profile_repository import (
    RolePromptProfileRepository,
)
from ...shared.application.context import RequestContext
from ...shared.domain.errors import NotFoundError
from ..ports.llm_provider import GenerationRequest, PromptMessage
from ..ports.token_counter import TokenCounter

# system prompt پیش‌فرض وقتی هیچ پروفایل نقشی resolve نشود.
_DEFAULT_SYSTEM_PROMPT = "تو یک دستیار هوش مصنوعی مفید، دقیق و محترم هستی."


class ContextManager:
    def __init__(
        self,
        *,
        message_repo: MessageRepository,
        profile_repo: RolePromptProfileRepository,
        model_repo: AIModelRepository,
        summary_repo: ConversationSummaryRepository,
        token_counter: TokenCounter,
        default_max_output_tokens: int = 1024,
        safety_margin: int = 512,
        recent_limit: int = 50,
    ) -> None:
        self._messages = message_repo
        self._profiles = profile_repo
        self._models = model_repo
        self._summaries = summary_repo
        self._counter = token_counter
        self._default_max_output = default_max_output_tokens
        self._safety_margin = safety_margin
        self._recent_limit = recent_limit

    def build_request(
        self,
        *,
        conversation: Conversation,
        ctx: RequestContext,
        retrieved_context: list[str] | None = None,
    ) -> GenerationRequest:
        model = self._models.get(conversation.model_config.model_id)
        if model is None:
            raise NotFoundError("مدل انتخاب‌شده‌ی مکالمه یافت نشد.")

        system_prompt = self._resolve_system_prompt(
            ctx=ctx, retrieved_context=retrieved_context
        )

        max_output = (
            conversation.model_config.max_output_tokens or self._default_max_output
        )
        budget = model.context_window - max_output - self._safety_margin
        if budget <= 0:
            # مدل با پنجره‌ی بسیار کوچک؛ فقط system prompt را می‌فرستیم.
            budget = 0

        used = self._counter.count(system_prompt)
        prefix: list[PromptMessage] = []

        summary = self._summaries.get_latest(conversation.id, ctx.tenant_id)
        summary_seq = summary.up_to_seq if summary else 0
        if summary is not None:
            summary_text = f"خلاصه‌ی بخش‌های پیشین گفت‌وگو:\n{summary.summary}"
            cost = self._counter.count(summary_text)
            if used + cost <= budget:
                used += cost
                prefix.append(PromptMessage(role="system", content=summary_text))

        recent = self._messages.list_recent(
            conversation.id, ctx.tenant_id, limit=self._recent_limit
        )
        selected: list[PromptMessage] = []
        for msg in recent:  # نزولی: جدیدترین اول
            if msg.seq <= summary_seq:
                break  # قدیمی‌تر از خلاصه؛ در summary پوشش داده شده
            if msg.status is not MessageStatus.COMPLETED:
                continue  # placeholderهای PENDING/در حال تولید را نمی‌فرستیم
            version = msg.active_version
            if version is None or not version.content:
                continue
            cost = self._counter.count(version.content)
            if used + cost > budget:
                break
            used += cost
            selected.append(PromptMessage(role=msg.role.value, content=version.content))

        selected.reverse()  # بازگردانی به ترتیب زمانی
        messages = tuple(prefix + selected)

        return GenerationRequest(
            model_key=model.key,
            messages=messages,
            system_prompt=system_prompt,
            temperature=conversation.model_config.temperature,
            top_p=conversation.model_config.top_p,
            max_output_tokens=max_output,
            metadata={"conversation_id": str(conversation.id)},
        )

    def _resolve_system_prompt(
        self, *, ctx: RequestContext, retrieved_context: list[str] | None
    ) -> str:
        role = self._parse_role(ctx.role)
        base = _DEFAULT_SYSTEM_PROMPT
        if role is not None:
            profile = self._profiles.resolve(role=role, tenant_id=ctx.tenant_id)
            if profile is not None and profile.is_active:
                base = profile.system_prompt

        if retrieved_context:
            joined = "\n\n".join(retrieved_context)
            base = (
                f"{base}\n\n"
                "برای پاسخ، از دانش مرتبط زیر استفاده کن و اگر پاسخ در آن نبود صادقانه بگو نمی‌دانی:\n"
                f"{joined}"
            )
        return base

    @staticmethod
    def _parse_role(raw: str) -> UserRole | None:
        try:
            return UserRole(raw)
        except ValueError:
            return None
