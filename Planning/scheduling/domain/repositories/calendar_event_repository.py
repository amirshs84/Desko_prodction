"""پورت مخزن رویدادهای تقویم (Dependency Inversion).

دامنه و لایه‌ی application فقط این قرارداد را می‌شناسند؛ پیاده‌سازی مبتنی بر ORM
در ``scheduling/infrastructure/persistence`` است و از طریق container تزریق می‌شود.
نتیجه: موتور برنامه‌ریزی و قواعد تقویم را می‌توان با یک مخزن درون‌حافظه‌ای تست کرد
و بعداً پیاده‌سازی ذخیره‌سازی را عوض کرد بدون دست زدن به منطق.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Sequence

from ..entities.calendar_event import CalendarEvent
from ..enums import EventKind
from ..value_objects.event_ref import EventRef
from ..value_objects.jalali_date import JalaliDate


class CalendarEventRepository(ABC):
    @abstractmethod
    def list_for_owner(
        self,
        owner_id: int,
        *,
        date_from: JalaliDate | None = None,
        date_to: JalaliDate | None = None,
    ) -> list[CalendarEvent]:
        """رویدادهای یک دانش‌آموز، به‌صورت اختیاری محدود به یک بازه‌ی تاریخ."""

    @abstractmethod
    def list_by_owners(
        self,
        owner_ids: Sequence[int],
        *,
        kind: EventKind | None = None,
        date_from: JalaliDate | None = None,
        date_to: JalaliDate | None = None,
    ) -> list[CalendarEvent]:
        """رویدادهای چند دانش‌آموز با یک کوئری — برای نماهای گروهی مشاور و مدیر."""

    @abstractmethod
    def find(self, ref: EventRef) -> CalendarEvent | None:
        ...

    @abstractmethod
    def get(self, ref: EventRef) -> CalendarEvent:
        """مثل ``find`` اما در صورت نبود، ``NotFoundError`` می‌دهد."""

    @abstractmethod
    def add_many(self, events: Sequence[CalendarEvent]) -> int:
        """درج دسته‌ای idempotent؛ تعداد رکوردهای واقعاً ایجادشده را برمی‌گرداند.

        رویدادهایی که همان (مالک، client_id) را دارند نادیده گرفته می‌شوند تا
        ارسال مجدد درخواست (retry شبکه) رکورد تکراری نسازد.
        """

    @abstractmethod
    def save(self, event: CalendarEvent) -> None:
        """ذخیره‌ی تغییرات با کنترل همزمانی خوش‌بینانه بر مبنای ``version``."""

    @abstractmethod
    def delete(self, ref: EventRef) -> None:
        ...

    @abstractmethod
    def list_by_group(self, group_id: str, *, owner_ids: Sequence[int] | None = None) -> list[CalendarEvent]:
        ...

    @abstractmethod
    def delete_by_group(self, group_id: str, *, owner_ids: Sequence[int] | None = None) -> int:
        """حذف کل یک گروه رویداد؛ تعداد حذف‌شده‌ها را برمی‌گرداند."""

    @abstractmethod
    def delete_mutable_for_owner(self, owner_id: int) -> int:
        """حذف همه‌ی رویدادهای قابل تغییرِ یک دانش‌آموز (مسیر بازگردانی اسنپ‌شات).

        رویدادهای ثابت مدرسه عمداً از این عملیات مستثنا هستند؛ بازگردانیِ برنامه
        نباید تایم‌تیبل مدرسه را پاک کند.
        """
