"""HeuristicTokenCounter — تخمین سریع توکن بدون tokenizer سنگین.

قاعده‌ی سرانگشتی رایج: تقریباً هر ۴ کاراکتر ≈ ۱ توکن. این تخمین برای بودجه‌بندی
context «به‌اندازه‌ی کافی خوب» است و هزینه‌ی محاسباتی/حافظه‌ی tokenizer واقعی را
تحمیل نمی‌کند. برای دقت بیشتر (مثلاً صورتحساب دقیق) در آینده با tiktoken جایگزین
می‌شود (پشت همان Port).
"""
from __future__ import annotations

import math


class HeuristicTokenCounter:
    _CHARS_PER_TOKEN = 4

    def count(self, text: str) -> int:
        if not text:
            return 0
        return max(1, math.ceil(len(text) / self._CHARS_PER_TOKEN))
