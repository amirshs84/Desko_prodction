"""واژگان دامنه‌ی تقویم و زمان‌بندی."""
from __future__ import annotations

from enum import Enum


class EventKind(str, Enum):
    """جنس رویداد — تعیین‌کننده‌ی قواعد نوشتن روی آن.

    ``IMMUTABLE`` رویدادهای ثابت مدرسه‌اند (کلاس درسی، فوق‌برنامه‌ی قطعی): نه
    مشاور، نه دانش‌آموز و نه موتور برنامه‌ریزی حق بازنویسی آن‌ها را ندارند و
    الگوریتم فقط می‌تواند دور آن‌ها برنامه بچیند.

    ``MUTABLE`` بلوک‌های مطالعاتی و رویدادهای شخصی‌اند که آزادانه جابه‌جا و ویرایش
    می‌شوند.
    """

    MUTABLE = 'mutable'
    IMMUTABLE = 'immutable'


class EventOrigin(str, Enum):
    """منشأ ایجاد رویداد — برای گزارش‌دهی و فیلتر کردن (چه کسی آن را ساخت)."""

    STUDENT = 'student'
    CONSULTANT = 'consultant'
    ALGORITHM = 'algorithm'
    SCHOOL = 'school'
