"""ModelConfig — تنظیمات فعال تولید یک مکالمه (Value Object تغییرناپذیر).

چرا VO؟ این تنظیمات هویت مستقل ندارند؛ صرفاً یک «مقدار» هستند که به مکالمه
چسبیده‌اند. تغییر تنظیمات یعنی جایگزینی کل شیء با یک VO جدید (immutability)،
نه mutate کردن آن — این از تغییرات پنهان و اثرات جانبی جلوگیری می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ..enums import Capability
from ...shared.domain.errors import ValidationError
from ...shared.domain.value_object import ValueObject


@dataclass(frozen=True)
class ModelConfig(ValueObject):
    model_id: UUID
    temperature: float = 0.7
    top_p: float = 1.0
    max_output_tokens: int | None = None

    def __post_init__(self) -> None:
        if not (0.0 <= self.temperature <= 2.0):
            raise ValidationError("temperature باید بین ۰ و ۲ باشد.")
        if not (0.0 <= self.top_p <= 1.0):
            raise ValidationError("top_p باید بین ۰ و ۱ باشد.")
        if self.max_output_tokens is not None and self.max_output_tokens <= 0:
            raise ValidationError("max_output_tokens باید مثبت باشد.")

    def with_model(self, model_id: UUID) -> "ModelConfig":
        """یک کپی با مدل جدید برمی‌گرداند (چون VO تغییرناپذیر است)."""
        return ModelConfig(
            model_id=model_id,
            temperature=self.temperature,
            top_p=self.top_p,
            max_output_tokens=self.max_output_tokens,
        )
