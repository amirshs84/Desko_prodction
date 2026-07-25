"""پورت مخزن اسنپ‌شات تقویم."""
from __future__ import annotations

from abc import ABC, abstractmethod

from ..entities.calendar_snapshot import CalendarSnapshot


class CalendarSnapshotRepository(ABC):
    @abstractmethod
    def add(self, snapshot: CalendarSnapshot) -> CalendarSnapshot:
        ...

    @abstractmethod
    def get(self, snapshot_id: int, *, owner_id: int) -> CalendarSnapshot:
        """اسنپ‌شات متعلق به همین دانش‌آموز؛ در غیر این صورت ``NotFoundError``."""

    @abstractmethod
    def list_for_owner(self, owner_id: int, *, limit: int = 10) -> list[CalendarSnapshot]:
        """جدیدترین اسنپ‌شات‌ها، بدون بار کردن رویدادها (فقط سرصفحه)."""

    @abstractmethod
    def prune(self, owner_id: int, *, keep: int) -> int:
        """حذف نسخه‌های قدیمی‌تر از ``keep`` تای آخر؛ تعداد حذف‌شده را برمی‌گرداند."""
