"""پورت خواندن و نوشتن بازه‌ی فعال هر دانش‌آموز.

کاربری که هرگز بازه‌اش را ویرایش نکرده ردیفی در دیتابیس ندارد؛ مخزن در آن حالت
``AwakeWindowPolicy.default()`` برمی‌گرداند و چیزی نمی‌سازد. ردیف فقط در لحظه‌ی
ویرایش ساخته می‌شود تا جدول به‌ازای هر کاربر بی‌دلیل پر نشود.
"""
from __future__ import annotations

from typing import Protocol, Sequence, runtime_checkable

from ..services.awake_window_policy import AwakeWindowPolicy


@runtime_checkable
class AwakeWindowRepository(Protocol):
    def get(self, user_id: int) -> AwakeWindowPolicy:
        """بازه‌ی فعال این کاربر، یا پیش‌فرض اگر تنظیمش نکرده باشد."""
        ...

    def get_many(self, user_ids: Sequence[int]) -> dict[int, AwakeWindowPolicy]:
        """بازه‌ی فعال گروهی — یک کوئری برای کل بچ برنامه‌ریزی.

        کلید همه‌ی شناسه‌های ورودی حاضر است (با پیش‌فرض برای کاربران بدون ردیف).
        """
        ...

    def save(self, user_id: int, policy: AwakeWindowPolicy) -> AwakeWindowPolicy:
        ...

    def reset(self, user_id: int) -> AwakeWindowPolicy:
        """برگشت به پیش‌فرض (حذف ردیف)."""
        ...
