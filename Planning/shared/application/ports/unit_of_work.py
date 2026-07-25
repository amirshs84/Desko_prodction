"""Port: Unit of Work — مرز تراکنش.

چرا انتزاع؟ لایه‌ی application نباید بداند تراکنش با Django انجام می‌شود یا چیز
دیگر؛ فقط به این قرارداد وابسته است (Dependency Inversion). پیاده‌سازی concrete در
``shared/infrastructure/unit_of_work.py`` است.

برنامه‌ریزی گروهی برای دهها دانش‌آموز باید «همه یا هیچ» باشد؛ در غیر این صورت یک
خطای میانی، نیمی از دانش‌آموزان را با برنامه و نیم دیگر را بی‌برنامه رها می‌کند.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class UnitOfWork(Protocol):
    def __enter__(self) -> 'UnitOfWork': ...

    def __exit__(self, exc_type, exc, tb) -> bool | None: ...
