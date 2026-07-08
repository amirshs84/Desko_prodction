"""TokenUsage — مصرف توکن یک تولید (Value Object تغییرناپذیر).

جمع‌پذیر است تا بتوان مصرف چند پیام را تجمیع کرد (برای گزارش/quota) بدون آنکه
منطق جمع در چند جای مختلف تکرار شود.
"""
from __future__ import annotations

from dataclasses import dataclass

from ...shared.domain.errors import ValidationError
from ...shared.domain.value_object import ValueObject


@dataclass(frozen=True)
class TokenUsage(ValueObject):
    prompt_tokens: int = 0
    completion_tokens: int = 0

    def __post_init__(self) -> None:
        if self.prompt_tokens < 0 or self.completion_tokens < 0:
            raise ValidationError("تعداد توکن نمی‌تواند منفی باشد.")

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    def __add__(self, other: "TokenUsage") -> "TokenUsage":
        return TokenUsage(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
        )
