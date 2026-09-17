"""IntensityProfile — ترجمه‌ی «سطح فشردگی + تگ درس» به طول بلوک و استراحت.

سطح فشردگی به‌تنهایی کافی نیست: یک بلوک تحلیلی (ریاضی، فیزیک) طولانی‌تر و با
استراحت بلندتر معنا می‌دهد، در حالی که بلوک حفظی (زیست، دینی) کوتاه‌تر و پرتکرارتر
مؤثرتر است. پس نگاشت دوبعدی است، و همه‌اش اینجا متمرکز شده تا الگوریتم چیدمان
هیچ ``if tag == ...`` نداشته باشد.

درسی که تگ ندارد دقیقاً همان رفتار قدیمی را می‌گیرد (پیش‌فرض هر سطح)، پس اضافه
شدن تگ‌ها برنامه‌های موجود را تکان نمی‌دهد.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject
from ..enums import IntensityLevel
from .subject_tag import SubjectTag

#: کوتاه‌ترین بلوکی که ارزش گذاشتن دارد.
DEFAULT_MIN_BLOCK_MINUTES = 30
#: باقی‌مانده‌ی کمتر از این، به‌جای تبدیل شدن به یک بلوک خرد، به بلوک قبلی می‌چسبد.
MIN_TAIL_MINUTES = 15


@dataclass(frozen=True)
class BlockShape(ValueObject):
    """شکل یک بلوک: چقدر مطالعه، چقدر استراحت بعدش، و کف طول بلوک."""

    study_minutes: int
    break_minutes: int
    min_block_minutes: int = DEFAULT_MIN_BLOCK_MINUTES

    def __post_init__(self) -> None:
        if self.study_minutes <= 0 or self.break_minutes < 0:
            raise ValidationError('پیکربندی طول بلوک و استراحت نامعتبر است.')
        if self.min_block_minutes <= 0 or self.min_block_minutes > self.study_minutes:
            raise ValidationError('حداقل طول بلوک باید بین ۱ و طول بلوک باشد.')

    @property
    def cycle_minutes(self) -> int:
        """طول یک چرخه‌ی «مطالعه + استراحت»."""
        return self.study_minutes + self.break_minutes


@dataclass(frozen=True)
class IntensityProfile(ValueObject):
    level: IntensityLevel
    default_shape: BlockShape
    by_tag: tuple[tuple[SubjectTag, BlockShape], ...] = ()

    @classmethod
    def for_level(cls, level: IntensityLevel) -> 'IntensityProfile':
        return _BY_LEVEL[level]

    def shape_for(self, tags: frozenset[SubjectTag] | None = None) -> BlockShape:
        """شکل بلوک برای این مجموعه تگ.

        فقط تگ‌های «جنس یادگیری» اثر دارند و اگر درس هم تحلیلی و هم حفظی برچسب
        خورده باشد، تحلیلی برنده است — محافظه‌کارانه‌ترین انتخاب، چون بلوک بلندتر
        و استراحت بیشتری می‌دهد.
        """
        if not tags:
            return self.default_shape
        overrides = dict(self.by_tag)
        for tag in (SubjectTag.ANALYTICAL, SubjectTag.MEMORIZATION):
            if tag in tags and tag in overrides:
                return overrides[tag]
        return self.default_shape

    def with_override(self, tag: SubjectTag, shape: BlockShape) -> 'IntensityProfile':
        """نسخه‌ای با یک override تازه — برای تنظیمات دلخواه مشاور در کاتالوگ درس."""
        remaining = tuple((key, value) for key, value in self.by_tag if key is not tag)
        return IntensityProfile(
            level=self.level,
            default_shape=self.default_shape,
            by_tag=tuple(sorted((*remaining, (tag, shape)), key=lambda pair: pair[0].value)),
        )


#: پیش‌فرض هر سطح عیناً همان مقادیر قبلی است تا درس‌های بدون تگ رفتارشان عوض نشود.
_BY_LEVEL: dict[IntensityLevel, IntensityProfile] = {
    IntensityLevel.LIGHT: IntensityProfile(
        level=IntensityLevel.LIGHT,
        default_shape=BlockShape(study_minutes=60, break_minutes=15),
        by_tag=(
            (SubjectTag.ANALYTICAL, BlockShape(60, 20)),
            (SubjectTag.MEMORIZATION, BlockShape(30, 10, min_block_minutes=20)),
        ),
    ),
    IntensityLevel.NORMAL: IntensityProfile(
        level=IntensityLevel.NORMAL,
        default_shape=BlockShape(study_minutes=90, break_minutes=15),
        by_tag=(
            (SubjectTag.ANALYTICAL, BlockShape(90, 20)),
            (SubjectTag.MEMORIZATION, BlockShape(45, 10, min_block_minutes=25)),
        ),
    ),
    IntensityLevel.HEAVY: IntensityProfile(
        level=IntensityLevel.HEAVY,
        default_shape=BlockShape(study_minutes=120, break_minutes=10),
        by_tag=(
            (SubjectTag.ANALYTICAL, BlockShape(120, 15)),
            (SubjectTag.MEMORIZATION, BlockShape(60, 10, min_block_minutes=30)),
        ),
    ),
}


__all__ = [
    'DEFAULT_MIN_BLOCK_MINUTES',
    'MIN_TAIL_MINUTES',
    'BlockShape',
    'IntensityProfile',
]
