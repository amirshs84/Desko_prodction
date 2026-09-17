"""پورت ذخیره‌ی بازخورد گیمیفای‌شده‌ی بلوک‌های مطالعه."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, Sequence, runtime_checkable

MIN_SCORE = 1
MAX_SCORE = 5


@dataclass(frozen=True)
class BlockFeedback:
    user_id: int
    event_client_id: str
    rating: int
    mood: int = 3
    subject: str = ''
    planned_minutes: int = 0
    actual_minutes: int = 0
    start_hour: int = 0


@runtime_checkable
class BlockFeedbackRepository(Protocol):
    def save(self, feedback: BlockFeedback) -> BlockFeedback:
        """ثبت یا به‌روزرسانی بازخورد یک بلوک (هر بلوک فقط یک بازخورد دارد)."""
        ...

    def list_recent(self, user_id: int, *, limit: int = 30) -> tuple[BlockFeedback, ...]:
        ...

    def rated_client_ids(self, user_id: int, client_ids: Sequence[str]) -> frozenset[str]:
        """کدام بلوک‌ها قبلاً امتیاز گرفته‌اند — برای پنهان کردن ویجت در UI."""
        ...
