"""پایه‌ی Value Object در DDD.

Value Object یک شیء تغییرناپذیر (immutable) و بدون هویت است که برابری آن بر
مبنای «مقدار» تعریف می‌شود (equality by value)، نه شناسه.

قرارداد استفاده: Value Object های concrete را با ``@dataclass(frozen=True)``
تعریف کنید؛ frozen بودن تغییرناپذیری و hashable بودن را تضمین می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ValueObject:
    """پایه‌ی نشانه‌گذاری برای Value Object ها.

    خالی است چون منطق در dataclass فرزند (frozen) تعریف می‌شود؛ صرفاً برای
    وضوح نوع (type clarity) و مستندسازی نیت طراحی وجود دارد.
    """
