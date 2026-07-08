"""پایه‌های Entity و AggregateRoot در DDD.

Entity: شیئی با «هویت پایدار». دو Entity وقتی برابرند که شناسه‌ی یکسان داشته
باشند (equality by identity)، نه لزوماً همه‌ی فیلدها.

AggregateRoot: تنها نقطه‌ی ورود به یک Aggregate؛ مسئول حفظ invariantها و
جمع‌آوری Domain Event ها.

قرارداد استفاده: موجودیت‌های concrete را با ``@dataclass(eq=False)`` تعریف کنید
تا __eq__/__hash__ پایه (بر مبنای id) حفظ شود و توسط dataclass بازنویسی نشود.
"""
from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

if TYPE_CHECKING:
    from .events import DomainEvent


class Entity:
    """پایه‌ی موجودیت‌ها با برابری بر مبنای هویت (id)."""

    id: UUID

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return NotImplemented
        # موجودیت‌های هم‌نوع با id یکسان، برابرند.
        return type(self) is type(other) and self.id == other.id

    def __hash__(self) -> int:
        return hash((type(self).__name__, self.id))


class AggregateRoot(Entity):
    """ریشه‌ی Aggregate با قابلیت ثبت Domain Event.

    رویدادها درون خود Aggregate جمع می‌شوند و پس از commit موفق در لایه‌ی
    application منتشر می‌گردند (dispatch). این جداسازی اجازه می‌دهد منطق دامنه
    بدون آگاهی از سازوکار انتشار، رویداد تولید کند.
    """

    def record_event(self, event: "DomainEvent") -> None:
        events = self.__dict__.setdefault("_domain_events", [])
        events.append(event)

    @property
    def domain_events(self) -> list["DomainEvent"]:
        return list(self.__dict__.get("_domain_events", []))

    def clear_events(self) -> None:
        self.__dict__["_domain_events"] = []
