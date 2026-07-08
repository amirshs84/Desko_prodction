"""ProviderFactory — انتخاب آداپتور بر اساس مدل (Factory + Strategy).

یک رجیستری ``provider_key → کلاس آداپتور`` نگه می‌دارد. افزودن Provider جدید =
ثبت یک کلاس، بدون تغییر در کد فراخواننده (Open/Closed).

config هر Provider (کلید API، base_url) از بیرون تزریق می‌شود؛ Factory آن را به
آداپتور می‌دهد. اسرار هرگز در این کلاس hardcode نمی‌شوند.
"""
from __future__ import annotations

from ...domain.entities.ai_model import AIModel
from ...domain.enums import Capability
from ...shared.domain.errors import ProviderUnavailableError, ValidationError
from .anthropic import AnthropicChatProvider
from .base import BaseChatProvider
from .fake import FakeChatProvider
from .local import LocalChatProvider
from .openai import OpenAIChatProvider


class ProviderFactory:
    def __init__(self, provider_configs: dict[str, dict] | None = None) -> None:
        self._configs = provider_configs or {}
        self._registry: dict[str, type[BaseChatProvider]] = {}
        for cls in (
            FakeChatProvider,
            OpenAIChatProvider,
            AnthropicChatProvider,
            LocalChatProvider,
        ):
            self._registry[cls.provider_key] = cls

    def register(self, provider_key: str, cls: type[BaseChatProvider]) -> None:
        """امکان افزودن/جایگزینی Provider در runtime (تست یا افزونه)."""
        self._registry[provider_key] = cls

    def create_chat_provider(self, model: AIModel) -> BaseChatProvider:
        if not model.supports(Capability.CHAT):
            raise ValidationError(
                f"مدل «{model.key}» قابلیت chat را پشتیبانی نمی‌کند."
            )
        cls = self._registry.get(model.provider_key)
        if cls is None:
            raise ProviderUnavailableError(
                detail=f"Provider «{model.provider_key}» پشتیبانی نمی‌شود."
            )
        return cls(self._configs.get(model.provider_key, {}))
