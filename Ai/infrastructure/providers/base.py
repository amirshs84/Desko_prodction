"""پایه‌ی مشترک آداپتورهای Chat + نگاشت خطا (Anti-Corruption Layer).

هر آداپتور فقط ``_stream`` را پیاده می‌کند؛ متد ``generate`` در این پایه، خطاهای
مختص Provider را به خطاهای یکنواخت دامنه نگاشت می‌کند تا لایه‌های بالاتر هرگز با
جزئیات یک Provider خاص درگیر نشوند (Isolation + Uniform Error Model).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import ClassVar, Iterator

from ...application.ports.llm_provider import GenerationRequest, TokenChunk
from ...domain.enums import Capability
from ...shared.domain.errors import (
    DomainError,
    ProviderTimeoutError,
    ProviderUnavailableError,
)


class BaseChatProvider(ABC):
    provider_key: ClassVar[str] = "base"
    capabilities: ClassVar[frozenset[Capability]] = frozenset({Capability.CHAT})

    def __init__(self, config: dict | None = None) -> None:
        self._config = config or {}

    @abstractmethod
    def _stream(self, request: GenerationRequest) -> Iterator[TokenChunk]:
        """پیاده‌سازی اختصاصی هر Provider؛ خطاهای خام آن را پرتاب می‌کند."""

    def generate(self, request: GenerationRequest) -> Iterator[TokenChunk]:
        try:
            yield from self._stream(request)
        except DomainError:
            # خطاهای دامنه از قبل یکنواخت‌اند؛ دست‌نخورده عبور می‌کنند.
            raise
        except TimeoutError as exc:
            raise ProviderTimeoutError() from exc
        except Exception as exc:  # noqa: BLE001 — عمداً همه را به خطای دامنه نگاشت می‌کنیم
            raise ProviderUnavailableError(detail=str(exc)) from exc

    def supports(self, capability: Capability) -> bool:
        return capability in self.capabilities
