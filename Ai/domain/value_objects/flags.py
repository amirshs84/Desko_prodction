"""ConversationFlags — فلگ‌های حالت مکالمه (Value Object).

pin و favorite ذاتاً «مقدار» هستند نه موجودیت مستقل؛ گروه‌بندی آن‌ها در یک VO،
منطق toggle را متمرکز و مکالمه (Aggregate Root) را تمیز نگه می‌دارد.
"""
from __future__ import annotations

from dataclasses import dataclass

from ...shared.domain.value_object import ValueObject


@dataclass(frozen=True)
class ConversationFlags(ValueObject):
    is_pinned: bool = False
    is_favorite: bool = False

    def toggled_pin(self) -> "ConversationFlags":
        return ConversationFlags(not self.is_pinned, self.is_favorite)

    def toggled_favorite(self) -> "ConversationFlags":
        return ConversationFlags(self.is_pinned, not self.is_favorite)
