"""OpenAIChatProvider — آداپتور ایزوله برای OpenAI.

نکات:
  - import کتابخانه‌ی openai «تنبل» (داخل متد) است تا ماژول import-safe بماند؛
    نبود کتابخانه پروژه را نمی‌شکند، بلکه هنگام استفاده خطای دامنه‌ی روشن می‌دهد.
  - Anti-Corruption Layer: ``_to_provider_messages`` فرمت داخلی ما را به فرمت
    OpenAI ترجمه می‌کند؛ اگر فردا Provider عوض شود، فقط همین آداپتور تغییر می‌کند.
"""
from __future__ import annotations

from typing import ClassVar, Iterator

from ....application.ports.llm_provider import GenerationRequest, TokenChunk
from ....domain.enums import Capability
from ....shared.domain.errors import ProviderUnavailableError
from ..base import BaseChatProvider


class OpenAIChatProvider(BaseChatProvider):
    provider_key: ClassVar[str] = "openai"
    capabilities: ClassVar[frozenset[Capability]] = frozenset(
        {Capability.CHAT, Capability.VISION, Capability.TOOLS}
    )

    def _stream(self, request: GenerationRequest) -> Iterator[TokenChunk]:
        try:
            import httpx
            from openai import OpenAI  # lazy import
        except ImportError as exc:  # pragma: no cover
            raise ProviderUnavailableError(
                detail="کتابخانه‌ی openai نصب نشده است."
            ) from exc

        # سرویس‌های واسط داخلی (GapGPT/AvalAI) گاهی در برقراری اتصال/TLS کند هستند؛
        # connect timeout پیش‌فرض openai (۵ ثانیه) کوتاه است و به APITimeoutError
        # منجر می‌شود. این مقادیر از config قابل‌تنظیم‌اند (با پیش‌فرض بخشنده).
        timeout = httpx.Timeout(
            float(self._config.get("timeout", 120.0)),
            connect=float(self._config.get("connect_timeout", 45.0)),
        )
        client = OpenAI(
            api_key=self._config.get("api_key"),
            base_url=self._config.get("base_url") or None,
            timeout=timeout,
            max_retries=int(self._config.get("max_retries", 2)),
        )
        stream = client.chat.completions.create(
            model=request.model_key,
            messages=self._to_provider_messages(request),
            temperature=request.temperature,
            top_p=request.top_p,
            max_tokens=request.max_output_tokens,
            stream=True,
        )
        for chunk in stream:
            delta = (chunk.choices[0].delta.content or "") if chunk.choices else ""
            if delta:
                yield TokenChunk(delta=delta)
        yield TokenChunk(delta="", finish_reason="stop")

    @staticmethod
    def _to_provider_messages(request: GenerationRequest) -> list[dict]:
        # Anti-Corruption Layer: فرمت داخلی → فرمت OpenAI.
        messages: list[dict] = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for m in request.messages:
            messages.append({"role": m.role, "content": m.content})
        return messages
