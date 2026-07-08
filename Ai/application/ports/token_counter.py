"""Port: TokenCounter — تخمین تعداد توکن یک متن.

بودجه‌بندی context به شمارش توکن نیاز دارد. tokenizer دقیق (مثل tiktoken) سنگین و
وابسته به مدل است؛ پشت این Port قرار می‌گیرد تا پیاده‌سازی heuristic سبک امروز،
فردا با tokenizer دقیق جایگزین شود — بدون تغییر در ContextManager.
"""
from __future__ import annotations

from typing import Protocol


class TokenCounter(Protocol):
    def count(self, text: str) -> int: ...
