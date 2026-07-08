"""Port: LLMProviderFactory — انتخاب آداپتور مناسب بر اساس مدل.

سرویس تولید (worker) نمی‌داند و نباید بداند کدام Provider concrete ساخته می‌شود؛
فقط مدل انتخابی کاربر را می‌دهد و یک ChatProvider می‌گیرد (Factory + Strategy +
Dependency Inversion).
"""
from __future__ import annotations

from typing import Protocol

from ...domain.entities.ai_model import AIModel
from .llm_provider import ChatProvider


class LLMProviderFactory(Protocol):
    def create_chat_provider(self, model: AIModel) -> ChatProvider: ...
