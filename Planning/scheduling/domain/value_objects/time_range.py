"""TimeRange — Value Object بازه‌ی زمانی درون‌روزی بر مبنای «دقیقه از نیمه‌شب».

هم‌راستا با مدل داده‌ی فعلی تقویم (``start_minutes``/``end_minutes``) و فرانت‌اند.
بازه نیم‌باز است: ``[start, end)`` — یعنی رویداد ۸:۰۰–۹:۰۰ با ۹:۰۰–۱۰:۰۰ تداخل
ندارد. تشخیص تداخل (Collision Detection) و پیدا کردن فضای خالی، همه روی همین
قرارداد نیم‌باز بنا می‌شوند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import InvalidTimeRangeError
from ....shared.domain.value_object import ValueObject

MINUTES_IN_DAY = 1440


@dataclass(frozen=True)
class TimeRange(ValueObject):
    start_minutes: int
    end_minutes: int

    def __post_init__(self) -> None:
        if not isinstance(self.start_minutes, int) or not isinstance(self.end_minutes, int):
            raise InvalidTimeRangeError('دقیقه‌ی شروع و پایان باید عدد صحیح باشد.')
        if self.start_minutes < 0 or self.end_minutes > MINUTES_IN_DAY:
            raise InvalidTimeRangeError(
                'بازه‌ی زمانی باید داخل یک شبانه‌روز باشد (۰ تا ۱۴۴۰ دقیقه).',
                meta={'start_minutes': self.start_minutes, 'end_minutes': self.end_minutes},
            )
        if self.start_minutes >= self.end_minutes:
            raise InvalidTimeRangeError(
                'زمان پایان باید بعد از زمان شروع باشد.',
                meta={'start_minutes': self.start_minutes, 'end_minutes': self.end_minutes},
            )

    # ---------- سازنده‌های کمکی ----------

    @classmethod
    def full_day(cls) -> 'TimeRange':
        return cls(0, MINUTES_IN_DAY)

    @classmethod
    def of_duration(cls, start_minutes: int, duration_minutes: int) -> 'TimeRange':
        return cls(start_minutes, start_minutes + duration_minutes)

    @classmethod
    def from_clock(cls, start: str, end: str) -> 'TimeRange':
        """ساخت از رشته‌ی ``HH:MM`` (برای پیکربندی و تست خوانا)."""
        return cls(_parse_clock(start), _parse_clock(end))

    # ---------- ویژگی‌ها ----------

    @property
    def duration_minutes(self) -> int:
        return self.end_minutes - self.start_minutes

    # ---------- روابط ----------

    def overlaps(self, other: 'TimeRange') -> bool:
        return self.start_minutes < other.end_minutes and other.start_minutes < self.end_minutes

    def contains(self, other: 'TimeRange') -> bool:
        return self.start_minutes <= other.start_minutes and other.end_minutes <= self.end_minutes

    def shifted_to(self, start_minutes: int) -> 'TimeRange':
        """همان طول، شروع جدید."""
        return TimeRange.of_duration(start_minutes, self.duration_minutes)

    def __str__(self) -> str:
        return f'{_format_clock(self.start_minutes)}–{_format_clock(self.end_minutes)}'


def _parse_clock(value: str) -> int:
    try:
        hours, minutes = value.split(':')
        return int(hours) * 60 + int(minutes)
    except (ValueError, AttributeError) as exc:
        raise InvalidTimeRangeError(f'ساعت نامعتبر است: {value!r}') from exc


def _format_clock(total_minutes: int) -> str:
    return f'{total_minutes // 60:02d}:{total_minutes % 60:02d}'
