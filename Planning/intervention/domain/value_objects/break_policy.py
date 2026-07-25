"""BreakPolicy — ترجمه‌ی سطح فشردگی به طول بلوک و فاصله‌ی استراحت.

سند برای MVP همین را می‌خواهد: «سطح فشردگی فعلاً فقط فواصل استراحت را تنظیم کند
(مثلاً Light: ۱۵ دقیقه استراحت به ازای هر ۶۰ دقیقه مطالعه)». جدول نگاشت اینجا
متمرکز است تا الگوریتم چیدمان هیچ ``if level == ...`` نداشته باشد.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject
from ..enums import IntensityLevel


@dataclass(frozen=True)
class BreakPolicy(ValueObject):
    study_minutes: int
    break_minutes: int

    def __post_init__(self) -> None:
        if self.study_minutes <= 0 or self.break_minutes < 0:
            raise ValidationError('پیکربندی استراحت نامعتبر است.')

    @classmethod
    def for_level(cls, level: IntensityLevel) -> 'BreakPolicy':
        return _BY_LEVEL[level]

    @property
    def cycle_minutes(self) -> int:
        """طول یک چرخه‌ی «مطالعه + استراحت»."""
        return self.study_minutes + self.break_minutes


_BY_LEVEL: dict[IntensityLevel, BreakPolicy] = {
    IntensityLevel.LIGHT: BreakPolicy(study_minutes=60, break_minutes=15),
    IntensityLevel.NORMAL: BreakPolicy(study_minutes=90, break_minutes=15),
    IntensityLevel.HEAVY: BreakPolicy(study_minutes=120, break_minutes=10),
}
