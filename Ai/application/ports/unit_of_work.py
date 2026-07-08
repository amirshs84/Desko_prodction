"""Port: Unit of Work — مرز تراکنش و انتشار رویداد.

Unit of Work تضمین می‌کند مجموعه‌ای از تغییرات به‌صورت «همه یا هیچ» (atomic)
اعمال شوند و رویدادهای دامنه فقط پس از commit موفق منتشر گردند.

چرا انتزاع (Port)؟ لایه‌ی application نباید بداند تراکنش با Django انجام می‌شود
یا چیز دیگر؛ فقط به این قرارداد وابسته است (Dependency Inversion). پیاده‌سازی
concrete در infrastructure/unit_of_work.py.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from ...shared.domain.entity import AggregateRoot


@runtime_checkable
class UnitOfWork(Protocol):
    def __enter__(self) -> "UnitOfWork": ...

    def __exit__(self, exc_type, exc, tb) -> bool | None: ...

    def collect_events(self, aggregate: AggregateRoot) -> None:
        """رویدادهای ثبت‌شده‌ی یک Aggregate را برای انتشار پس از commit صف می‌کند."""
        ...
