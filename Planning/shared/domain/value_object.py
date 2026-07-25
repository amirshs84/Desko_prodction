"""پایه‌ی Value Object در DDD.

Value Object یک شیء تغییرناپذیر (immutable) و بدون هویت است که برابری آن بر
مبنای «مقدار» تعریف می‌شود، نه شناسه.

قرارداد استفاده: Value Object های concrete را با ``@dataclass(frozen=True)``
تعریف کنید؛ frozen بودن تغییرناپذیری و hashable بودن را تضمین می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ValueObject:
    """پایه‌ی نشانه‌گذاری برای Value Object ها."""
