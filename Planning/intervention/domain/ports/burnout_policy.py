"""BurnoutPolicy — قید جلوگیری از فرسودگی (سقف مطالعه‌ی هر درس).

سند: «تعریف متغیر سقف مطالعه (MaxThreshold) برای هر درس در اینترفیس‌ها الزامی است».
این قید در موتور *قبل* از چیدمان اعمال می‌شود: اگر مشاور ۲۰ ساعت ریاضی در هفته
بخواهد، سقف آن را کم می‌کند و در پیش‌نمایش هشدار می‌دهد؛ یعنی الگوریتم هیچ‌وقت
نمی‌تواند از حد سلامت عبور کند، حتی اگر ظرفیت تقویم اجازه بدهد.

``None`` یعنی «سقفی تعیین نشده».
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable


@runtime_checkable
class BurnoutPolicy(Protocol):
    def max_daily_minutes(self, subject: str) -> int | None:
        """بیشترین دقایق مجاز این درس در یک روز."""
        ...

    def max_window_minutes(self, subject: str) -> int | None:
        """بیشترین دقایق مجاز این درس در کل بازه‌ی برنامه."""
        ...
