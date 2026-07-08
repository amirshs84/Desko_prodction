"""LocalChatProvider — آداپتور برای مدل‌های محلی/self-hosted.

بسیاری از سرورهای محلی (vLLM، Ollama، LM Studio، TGI) یک API سازگار با OpenAI
ارائه می‌دهند؛ بنابراین از همان مسیر با ``base_url`` محلی استفاده می‌کنیم. مزیت:
حریم خصوصی داده و استقلال از سرویس ابری. جداسازی به‌صورت آداپتور مستقل حفظ شده
تا اگر پروتکل محلی متفاوت شد، بدون اثر روی بقیه تغییر کند.
"""
from __future__ import annotations

from typing import ClassVar, Iterator

from ....application.ports.llm_provider import GenerationRequest, TokenChunk
from ....domain.enums import Capability
from ....shared.domain.errors import ProviderUnavailableError
from ..base import BaseChatProvider


class LocalChatProvider(BaseChatProvider):
    provider_key: ClassVar[str] = "local"
    capabilities: ClassVar[frozenset[Capability]] = frozenset({Capability.CHAT})

    def _stream(self, request: GenerationRequest) -> Iterator[TokenChunk]:
        try:
            from openai import OpenAI  # سرورهای محلی معمولاً OpenAI-compatible‌اند
        except ImportError as exc:  # pragma: no cover
            raise ProviderUnavailableError(
                detail="کلاینت OpenAI-compatible نصب نشده است."
            ) from exc

        base_url = self._config.get("base_url") or "http://localhost:8000/v1"
        client = OpenAI(api_key=self._config.get("api_key") or "not-needed", base_url=base_url)
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
        messages: list[dict] = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for m in request.messages:
            messages.append({"role": m.role, "content": m.content})
        return messages
