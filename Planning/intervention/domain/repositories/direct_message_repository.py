"""پورت مخزن پیام مستقیم مشاور ↔ دانش‌آموز."""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from ..entities.direct_message import DirectMessage


@runtime_checkable
class DirectMessageRepository(Protocol):
    def add(self, message: DirectMessage) -> DirectMessage:
        ...

    def list_thread(
        self, *, consultant_id: int, student_id: int,
    ) -> list[DirectMessage]:
        ...

    def list_for_student(self, *, student_id: int) -> list[DirectMessage]:
        """همه پیام‌های یک دانش‌آموز با مشاوران مختلف (مرتب زمانی)."""
        ...

    def list_recent_for_consultant(
        self, *, consultant_id: int, limit: int = 30,
    ) -> list[DirectMessage]:
        """آخرین پیام‌های همه تردهای یک مشاور (جدیدترین‌ها اول)."""
        ...
