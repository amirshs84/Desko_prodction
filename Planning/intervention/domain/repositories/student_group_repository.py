"""پورت مخزن گروه‌های دانش‌آموزی.

همه‌ی متدها با ``consultant_id`` محدود می‌شوند؛ یعنی ایزولاسیون بین مشاوران در
سطح مخزن اعمال می‌شود، نه با یادآوری در هر use-case. اگر use-case ای فراموش کند
مالکیت را چک کند، کوئری هم چیزی برنمی‌گرداند.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from ..entities.student_group import StudentGroup


class StudentGroupRepository(ABC):
    @abstractmethod
    def add(self, group: StudentGroup) -> StudentGroup:
        """ذخیره‌ی گروه تازه و برگرداندن آن با شناسه‌ی تخصیص‌یافته.

        در صورت تکراری بودن نام برای همان مشاور، ``ConflictError``.
        """

    @abstractmethod
    def get(self, group_id: int, *, consultant_id: int) -> StudentGroup:
        """گروهِ همین مشاور؛ در غیر این صورت ``NotFoundError``."""

    @abstractmethod
    def list_for_consultant(self, consultant_id: int) -> list[StudentGroup]:
        ...

    @abstractmethod
    def save(self, group: StudentGroup) -> None:
        """ذخیره‌ی نام/توضیح و همگام‌سازی تفاضلی اعضا."""

    @abstractmethod
    def delete(self, group_id: int, *, consultant_id: int) -> None:
        ...
