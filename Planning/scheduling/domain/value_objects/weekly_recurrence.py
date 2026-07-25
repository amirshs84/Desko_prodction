"""WeeklyRecurrence — تکرار هفتگی روی بازه‌ای از روزهای شمسی.

کلاس‌های مدرسه ماهیتاً هفتگی‌اند («شنبه و دوشنبه، از اول مهر تا پایان دی»). بسط
این الگو به فهرست روزها یک قاعده‌ی تقویمی است، پس در دامنه می‌نشیند نه در ویو؛
هم موتور برنامه‌ریزی و هم اندپوینت رویداد ثابت مدیر از همین یک پیاده‌سازی
استفاده می‌کنند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject
from .jalali_date import JalaliDate

MAX_SPAN_DAYS = 366


@dataclass(frozen=True)
class WeeklyRecurrence(ValueObject):
    """روزهای هفته (شنبه=۰ ... جمعه=۶) در بازه‌ی [start, end]."""

    weekdays: tuple[int, ...]
    start: JalaliDate
    end: JalaliDate

    def __post_init__(self) -> None:
        if not self.weekdays:
            raise ValidationError('حداقل یک روز هفته باید انتخاب شود.')
        if any(day < 0 or day > 6 for day in self.weekdays):
            raise ValidationError('روز هفته باید بین ۰ (شنبه) و ۶ (جمعه) باشد.')
        span = self.start.days_until(self.end)
        if span < 0:
            raise ValidationError('تاریخ پایان تکرار نمی‌تواند قبل از تاریخ شروع باشد.')
        if span > MAX_SPAN_DAYS:
            raise ValidationError(
                f'بازه‌ی تکرار نمی‌تواند بیش از {MAX_SPAN_DAYS} روز باشد.',
                meta={'span_days': span},
            )

    def dates(self) -> list[JalaliDate]:
        selected = set(self.weekdays)
        return [day for day in self.start.iter_range_to(self.end) if day.weekday() in selected]
