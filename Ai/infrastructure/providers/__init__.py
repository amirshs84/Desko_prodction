"""AI Providers — آداپتورهای ایزوله + Provider Factory.

هر Provider در پکیج مستقل خودش زندگی می‌کند و از طریق Anti-Corruption Layer فرمت
داخلی دامنه را به/از فرمت اختصاصی آن سرویس ترجمه می‌کند. جزئیات هر Provider هرگز
بیرون درز نمی‌کند (Isolation).

افزودن Provider جدید (Strategy): یک کلاس جدید از BaseChatProvider بساز و در
ProviderFactory ثبت کن — بدون تغییر در دامنه/سرویس (Open/Closed).
"""
from .anthropic import AnthropicChatProvider
from .base import BaseChatProvider
from .factory import ProviderFactory
from .fake import FakeChatProvider
from .local import LocalChatProvider
from .openai import OpenAIChatProvider

__all__ = [
    "AnthropicChatProvider",
    "BaseChatProvider",
    "FakeChatProvider",
    "LocalChatProvider",
    "OpenAIChatProvider",
    "ProviderFactory",
]
