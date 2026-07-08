"""FakeChatProvider — آداپتور قطعی و بدون شبکه.

هدف: توسعه/تست کامل مسیر تولید و استریم بدون فراخوانی واقعی API (بدون هزینه و
بدون flakiness). خروجی قطعی است تا assertion در تست ممکن باشد.
"""
from __future__ import annotations

from typing import ClassVar, Iterator

from ....application.ports.llm_provider import GenerationRequest, TokenChunk
from ....domain.enums import Capability
from ....domain.value_objects.token_usage import TokenUsage
from ..base import BaseChatProvider


class FakeChatProvider(BaseChatProvider):
    provider_key: ClassVar[str] = "fake"
    capabilities: ClassVar[frozenset[Capability]] = frozenset(
        {Capability.CHAT, Capability.VISION}
    )

    def _stream(self, request: GenerationRequest) -> Iterator[TokenChunk]:
        last = request.messages[-1].content if request.messages else ""
        response = f"[fake:{request.model_key}] {last}".strip()
        words = response.split(" ")
        for word in words:
            yield TokenChunk(delta=word + " ")
        prompt_tokens = sum(len(m.content.split()) for m in request.messages)
        yield TokenChunk(
            delta="",
            finish_reason="stop",
            usage=TokenUsage(
                prompt_tokens=prompt_tokens, completion_tokens=len(words)
            ),
        )
