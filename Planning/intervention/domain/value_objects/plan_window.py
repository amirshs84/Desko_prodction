"""PlanWindow — بازه‌ی روزهایی که برنامه روی آن ساخته می‌شود."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator

from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject

MAX_WINDOW_DAYS = 60


@dataclass(frozen=True)
class PlanWindow(ValueObject):
    start: JalaliDate
    end: JalaliDate

    def __post_init__(self) -> None:
        if self.start.days_until(self.end) < 0:
            raise ValidationError('تاریخ پایان بازه نمی‌تواند قبل از شروع باشد.')
        if self.length_days > MAX_WINDOW_DAYS:
            raise ValidationError(
                f'بازه‌ی برنامه‌ریزی نباید بیش از {MAX_WINDOW_DAYS} روز باشد.',
                meta={'length_days': self.length_days},
            )

    @classmethod
    def week_of(cls, day: JalaliDate) -> 'PlanWindow':
        """هفته‌ی شمسی شامل ``day`` (شنبه تا جمعه)."""
        start = day.week_start()
        return cls(start=start, end=start.add_days(6))

    @property
    def length_days(self) -> int:
        return self.start.days_until(self.end) + 1

    def days(self) -> Iterator[JalaliDate]:
        return self.start.iter_range_to(self.end)

    def contains(self, day: JalaliDate) -> bool:
        return self.start.days_until(day) >= 0 and day.days_until(self.end) >= 0

    def __str__(self) -> str:
        return f'{self.start} → {self.end}'
