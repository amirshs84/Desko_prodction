"""EventRef — شناسه‌ی دامنه‌ای یک رویداد تقویم.

شناسه‌ی کسب‌وکاری رویداد ``client_id`` است (کلاینت آن را می‌سازد تا کار offline و
idempotent باشد)، اما این شناسه فقط «به‌ازای هر کاربر» یکتاست. پس هویت واقعی
رویداد جفتِ (مالک، client_id) است. با مدل کردن آن به‌عنوان یک Value Object،
برابری موجودیت‌ها در سطح کل سیستم درست می‌ماند، نه فقط داخل تقویم یک کاربر.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject


@dataclass(frozen=True)
class EventRef(ValueObject):
    owner_id: int
    client_id: str

    def __post_init__(self) -> None:
        if not self.client_id or not self.client_id.strip():
            raise ValidationError('شناسه‌ی رویداد نمی‌تواند خالی باشد.')
        if len(self.client_id) > 64:
            raise ValidationError('شناسه‌ی رویداد بیش از حد طولانی است.')

    def __str__(self) -> str:
        return f'{self.owner_id}:{self.client_id}'
