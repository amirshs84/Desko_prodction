"""JalaliDate — Value Object تاریخ شمسی با تبدیل دوطرفه‌ی میلادی.

چرا اینجا و نه در ``api/jalali_utils.py``؟ آن ماژول ابزار برچسب‌گذاری نمودار و
مرز روز برای گزارش‌های مدیر است و فقط تبدیل «میلادی → شمسی» دارد. موتور
برنامه‌ریزی به عملیات تقویمی کامل نیاز دارد: پیمایش روزها، روز هفته، و تبدیل
«شمسی → میلادی» برای ذخیره‌ی ستون ایندکس‌شده‌ی تاریخ و کوئری بازه‌ای.

قرارداد روز هفته: شنبه = ۰ ... جمعه = ۶ — دقیقاً مطابق
``frontend/src/calendar/lib/jalaliUtils.ts`` تا مرز روزها بین فرانت و بک یکی باشد.

الگوریتم تبدیل همان الگوریتم استاندارد jalaali است (هم‌خانواده‌ی
``api.jalali_utils.gregorian_to_jalali`` و ``jalaali-js`` در فرانت‌اند).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterator

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject

SATURDAY_FIRST_WEEKDAY_LABELS = (
    'شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه',
)

_GREGORIAN_MONTH_OFFSETS = (0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334)


def _is_gregorian_leap(gy: int) -> bool:
    return (gy % 4 == 0 and gy % 100 != 0) or gy % 400 == 0


def gregorian_to_jalali(gy: int, gm: int, gd: int) -> tuple[int, int, int]:
    """تبدیل میلادی به شمسی."""
    if gy > 1600:
        jy = 979
        gy -= 1600
    else:
        jy = 0
        gy -= 621
    gy2 = gy + 1 if gm > 2 else gy
    days = (
        365 * gy
        + (gy2 + 3) // 4
        - (gy2 + 99) // 100
        + (gy2 + 399) // 400
        - 80
        + gd
        + _GREGORIAN_MONTH_OFFSETS[gm - 1]
    )
    jy += 33 * (days // 12053)
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + days // 31
        jd = 1 + days % 31
    else:
        jm = 7 + (days - 186) // 30
        jd = 1 + (days - 186) % 30
    return jy, jm, jd


def jalali_to_gregorian(jy: int, jm: int, jd: int) -> tuple[int, int, int]:
    """تبدیل شمسی به میلادی (معکوس دقیق تابع بالا)."""
    if jy > 979:
        gy = 1600
        jy -= 979
    else:
        gy = 621
    days = (
        365 * jy
        + (jy // 33) * 8
        + (jy % 33 + 3) // 4
        + 78
        + jd
        + ((jm - 1) * 31 if jm < 7 else (jm - 7) * 30 + 186)
    )
    gy += 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    gd = days + 1
    month_lengths = (
        31, 29 if _is_gregorian_leap(gy) else 28, 31, 30, 31, 30,
        31, 31, 30, 31, 30, 31,
    )
    gm = 0
    while gm < 12 and gd > month_lengths[gm]:
        gd -= month_lengths[gm]
        gm += 1
    return gy, gm + 1, gd


def _roundtrip(jy: int, jm: int, jd: int) -> tuple[int, int, int]:
    gy, gm, gd = jalali_to_gregorian(jy, jm, jd)
    return gregorian_to_jalali(gy, gm, gd)


@dataclass(frozen=True)
class JalaliDate(ValueObject):
    """یک روز شمسی. تغییرناپذیر؛ همه‌ی عملیات نمونه‌ی جدید برمی‌گردانند."""

    jy: int
    jm: int
    jd: int

    def __post_init__(self) -> None:
        if not 1 <= self.jm <= 12:
            raise ValidationError(f'ماه شمسی نامعتبر است: {self.jm}')
        if not 1 <= self.jd <= 31:
            raise ValidationError(f'روز شمسی نامعتبر است: {self.jd}')
        # اعتبارسنجی طول واقعی ماه: رفت‌وبرگشت باید همان تاریخ را بدهد
        # (مثلاً ۳۱ اسفند، یا ۳۰ اسفند در سال غیرکبیسه، وجود ندارد).
        if _roundtrip(self.jy, self.jm, self.jd) != (self.jy, self.jm, self.jd):
            raise ValidationError(f'تاریخ شمسی وجود ندارد: {self.jy}/{self.jm}/{self.jd}')

    # ---------- تبدیل ----------

    @classmethod
    def from_gregorian(cls, value: date) -> 'JalaliDate':
        return cls(*gregorian_to_jalali(value.year, value.month, value.day))

    def to_gregorian(self) -> date:
        gy, gm, gd = jalali_to_gregorian(self.jy, self.jm, self.jd)
        return date(gy, gm, gd)

    # ---------- پیمایش ----------

    def add_days(self, count: int) -> 'JalaliDate':
        return JalaliDate.from_gregorian(self.to_gregorian() + timedelta(days=count))

    def days_until(self, other: 'JalaliDate') -> int:
        return (other.to_gregorian() - self.to_gregorian()).days

    def weekday(self) -> int:
        """شنبه = ۰ ... جمعه = ۶."""
        return (self.to_gregorian().weekday() + 2) % 7

    @property
    def is_friday(self) -> bool:
        return self.weekday() == 6

    def week_start(self) -> 'JalaliDate':
        """شنبه‌ی همان هفته."""
        return self.add_days(-self.weekday())

    def iter_range_to(self, end: 'JalaliDate') -> Iterator['JalaliDate']:
        """پیمایش روزها از این تاریخ تا ``end`` (شامل هر دو سر)."""
        total = self.days_until(end)
        if total < 0:
            raise ValidationError('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.')
        current = self
        for _ in range(total + 1):
            yield current
            current = current.add_days(1)

    def __str__(self) -> str:
        return f'{self.jy:04d}/{self.jm:02d}/{self.jd:02d}'
