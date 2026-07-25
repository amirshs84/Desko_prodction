"""ISubjectWeightCalculator — قرارداد وزن‌دهی درس‌ها.

سند: «تعریف اینترفیس ISubjectWeightCalculator؛ در MVP بر اساس نسبت‌های دستی یا
توزیع یکنواخت، و در آینده با تزریق ماژول AI بدون تغییر در هسته».

امضا عمداً ``student_id`` می‌گیرد، هرچند پیاده‌سازی‌های MVP از آن استفاده نمی‌کنند.
دلیل: وزن‌دهی «مبتنی بر نقاط ضعف» ماهیتاً برای هر دانش‌آموز متفاوت است؛ اگر امضا
بدون آن نوشته می‌شد، ورود ماژول AI همه‌ی مصرف‌کننده‌ها را می‌شکست.

وزن‌ها لازم نیست نرمال‌شده باشند؛ موتور خودش نسبت‌گیری می‌کند.
"""
from __future__ import annotations

from typing import Protocol, Sequence, runtime_checkable


@runtime_checkable
class SubjectWeightCalculator(Protocol):
    def weights(self, *, student_id: int, subjects: Sequence[str]) -> dict[str, float]:
        """وزن هر درس برای این دانش‌آموز (اعداد مثبت)."""
        ...
