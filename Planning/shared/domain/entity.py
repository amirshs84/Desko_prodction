"""پایه‌های Entity و AggregateRoot در DDD.

Entity: شیئی با «هویت پایدار»؛ دو Entity وقتی برابرند که شناسه‌ی یکسان داشته
باشند (equality by identity)، نه لزوماً همه‌ی فیلدها.

AggregateRoot: تنها نقطه‌ی ورود به یک Aggregate؛ مسئول حفظ invariant ها.

قرارداد استفاده: موجودیت‌های concrete را با ``@dataclass(eq=False)`` تعریف کنید
تا __eq__/__hash__ پایه (بر مبنای id) توسط dataclass بازنویسی نشود.

برخلاف اپ ``Ai``، نوع شناسه اینجا آزاد است (``Hashable``)؛ چون در این اپ روی
persistence عمل‌گرا توافق شده و شناسه‌ی موجودیت‌ها می‌تواند یک Value Object
ترکیبی باشد (مثلاً EventRef) نه فقط UUID.
"""
from __future__ import annotations

from typing import Hashable


class Entity:
    """پایه‌ی موجودیت‌ها با برابری بر مبنای هویت (id)."""

    id: Hashable

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Entity):
            return NotImplemented
        return type(self) is type(other) and self.id == other.id

    def __hash__(self) -> int:
        return hash((type(self).__name__, self.id))


class AggregateRoot(Entity):
    """ریشه‌ی Aggregate؛ نقطه‌ی اعمال قواعد دامنه روی مجموعه‌ی موجودیت‌ها."""
