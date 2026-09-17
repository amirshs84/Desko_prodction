"""SubjectCatalog — دسترسی فقط‌خواندنی موتور به پروفایل درس‌های مدرسه.

موتور فقط می‌پرسد «تگ و بار شناختی این نام درس چیست؟» و هرگز نمی‌نویسد. نوشتن کار
سرویس کاتالوگ در لایه‌ی application است. درسی که در کاتالوگ نباشد خطا نمی‌دهد؛
پروفایل خنثی برمی‌گردد.
"""
from __future__ import annotations

from typing import Protocol, Sequence, runtime_checkable

from ..value_objects.subject_profile import SubjectProfile


@runtime_checkable
class SubjectCatalog(Protocol):
    def profiles_for(
        self, *, school_id: int | None, names: Sequence[str],
    ) -> dict[str, SubjectProfile]:
        """نگاشت «نام درس → پروفایل» برای نام‌های خواسته‌شده.

        کلیدها دقیقاً همان رشته‌های ورودی‌اند؛ نام‌های ناشناخته هم کلید دارند و
        مقدارشان ``SubjectProfile.fallback`` است تا مصرف‌کننده نیازی به بررسی
        ``None`` نداشته باشد.
        """
        ...
