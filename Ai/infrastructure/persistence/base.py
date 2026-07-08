"""پایه‌های مشترک لایه‌ی Persistence.

اینجا فقط ابزارهای مستقل از مدلِ concrete قرار دارند:
  - Mapper: قرارداد نگاشت دوطرفه بین Entity دامنه و Django Model. این نگاشت،
    ORM را «پشت مرز» نگه می‌دارد تا از دامنه بیرون درز نکند.

مدل‌های Django و Repositoryهای concrete در «لایه ۵: Repository Layer» ساخته
می‌شوند و از این پایه‌ها استفاده خواهند کرد.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

E = TypeVar("E")  # Entity دامنه
M = TypeVar("M")  # Django Model


class Mapper(ABC, Generic[E, M]):
    """نگاشت دوطرفه بین Entity دامنه و Django Model."""

    @abstractmethod
    def to_entity(self, model: M) -> E:
        """از رکورد دیتابیس به موجودیت خالص دامنه."""

    @abstractmethod
    def to_model(self, entity: E) -> M:
        """از موجودیت دامنه به رکورد دیتابیس (برای درج/به‌روزرسانی)."""
