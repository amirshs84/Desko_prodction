"""AnthropicChatProvider — آداپتور ایزوله برای Anthropic (Claude).

مانند OpenAI با import تنبل و Anti-Corruption Layer مخصوص خود. تفاوت مهم:
Anthropic فیلد ``system`` را جدا از پیام‌ها می‌گیرد (نه به‌عنوان یک message با
نقش system) — همین تفاوت دقیقاً دلیل وجود ACL جداگانه برای هر Provider است.
"""
from __future__ import annotations

from typing import ClassVar, Iterator

from ....application.ports.llm_provider import GenerationRequest, TokenChunk
from ....domain.enums import Capability
from ....shared.domain.errors import ProviderUnavailableError
from ..base import BaseChatProvider


class AnthropicChatProvider(BaseChatProvider):
    provider_key: ClassVar[str] = "anthropic"
    capabilities: ClassVar[frozenset[Capability]] = frozenset(
        {Capability.CHAT, Capability.VISION}
    )

    def _stream(self, request: GenerationRequest) -> Iterator[TokenChunk]:
        try:
            import anthropic  # lazy import
        except ImportError as exc:  # pragma: no cover
            raise ProviderUnavailableError(
                detail="کتابخانه‌ی anthropic نصب نشده است."
            ) from exc

        client = anthropic.Anthropic(api_key=self._config.get("api_key"))
        with client.messages.stream(
            model=request.model_key,
            system=request.system_prompt or "",
            messages=self._to_provider_messages(request),
            temperature=request.temperature,
            top_p=request.top_p,
            max_tokens=request.max_output_tokens or 1024,
        ) as stream:
            for text in stream.text_stream:
                if text:
                    yield TokenChunk(delta=text)
        yield TokenChunk(delta="", finish_reason="stop")

    @staticmethod
    def _to_provider_messages(request: GenerationRequest) -> list[dict]:
        # ACL: Anthropic فقط نقش‌های user/assistant را در messages می‌پذیرد؛
        # system جداگانه پاس داده می‌شود (بالا).
        return [
            {"role": m.role, "content": m.content}
            for m in request.messages
            if m.role in ("user", "assistant")
        ]
