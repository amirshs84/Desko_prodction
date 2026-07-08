"""Port: LLMProvider — قرارداد تعامل با سرویس‌های هوش مصنوعی.

طبق اصل ISP (تفکیک interface در SOLID)، به‌جای یک interface بزرگ، سه قرارداد
مجزا داریم:
  - ChatProvider          : تولید پاسخ متنی (streaming).
  - EmbeddingProvider     : تولید بردار برای RAG (لایه ۱۲/۱۳).
  - TranscriptionProvider : تبدیل گفتار به متن (آینده).

یک آداپتور می‌تواند چند قرارداد را همزمان پیاده کند، اما مصرف‌کننده فقط به
قراردادی که نیاز دارد وابسته می‌شود.

ساختارهای درخواست/پاسخ در همین‌جا تعریف شده‌اند تا «زبان مشترک داخلی» ما باشند؛
هر آداپتور در Anti-Corruption Layer خود این‌ها را به/از فرمت اختصاصی Provider
ترجمه می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterator, Protocol, runtime_checkable

from ...domain.enums import Capability
from ...domain.value_objects.token_usage import TokenUsage


@dataclass(frozen=True)
class PromptMessage:
    """یک پیام در تاریخچه‌ی ارسالی به مدل (فرمت داخلی، نه فرمت Provider)."""

    role: str  # user | assistant | system | tool
    content: str


@dataclass(frozen=True)
class GenerationRequest:
    """درخواست تولید؛ ورودی استاندارد همه‌ی ChatProviderها."""

    model_key: str
    messages: tuple[PromptMessage, ...]
    system_prompt: str | None = None
    temperature: float = 0.7
    top_p: float = 1.0
    max_output_tokens: int | None = None
    metadata: dict = field(default_factory=dict)


@dataclass(frozen=True)
class TokenChunk:
    """یک قطعه از خروجی stream.

    قطعات میانی فقط ``delta`` دارند؛ قطعه‌ی پایانی ``finish_reason`` و ``usage``
    را حمل می‌کند تا مصرف توکن دقیق ثبت شود.
    """

    delta: str = ""
    finish_reason: str | None = None
    usage: TokenUsage | None = None


@runtime_checkable
class ChatProvider(Protocol):
    provider_key: str

    def generate(self, request: GenerationRequest) -> Iterator[TokenChunk]: ...

    def supports(self, capability: Capability) -> bool: ...


class EmbeddingProvider(Protocol):
    provider_key: str

    def embed(self, texts: list[str]) -> list[list[float]]: ...


class TranscriptionProvider(Protocol):
    provider_key: str

    def transcribe(self, *, storage_key: str, mime_type: str) -> str: ...
