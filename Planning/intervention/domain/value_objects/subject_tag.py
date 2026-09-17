"""تگ‌های درس و بار شناختی — پایه‌ی «توزیع علمی» در موتور برنامه‌ریزی.

دو محور مستقل داریم و یک درس معمولاً از هر محور یک تگ می‌گیرد:

  • محور برنامه‌ی درسی: عمومی / اختصاصی
  • محور جنس یادگیری: تحلیلی / حفظی

محور دوم است که روی چیدمان اثر می‌گذارد: بلوک تحلیلی طولانی‌تر و استراحت بعدش
بیشتر است، و موتور از چسباندن دو بلوک تحلیلیِ سنگین به هم پرهیز می‌کند. محور اول
فعلاً فقط برای گزارش و فیلتر مشاور است، اما چون ممکن است فردا وزن بگیرد از همین
حالا مدل شده.
"""
from __future__ import annotations

from enum import Enum

#: بار شناختی یک درس در مقیاس ۱ تا ۳. «سنگین» یعنی ۳ و همان چیزی است که قید
#: مجاورت شناختی روی آن حساس است.
MIN_COGNITIVE_LOAD = 1
MAX_COGNITIVE_LOAD = 3
HEAVY_COGNITIVE_LOAD = 3


class SubjectTag(str, Enum):
    GENERAL = 'general'
    SPECIALIZED = 'specialized'
    ANALYTICAL = 'analytical'
    MEMORIZATION = 'memorization'

    @property
    def label(self) -> str:
        return _LABELS[self]

    @property
    def is_learning_nature(self) -> bool:
        """آیا این تگ روی جنس یادگیری است (و نه صرفاً دسته‌ی برنامه‌ی درسی)؟"""
        return self in (SubjectTag.ANALYTICAL, SubjectTag.MEMORIZATION)


_LABELS: dict[SubjectTag, str] = {
    SubjectTag.GENERAL: 'عمومی',
    SubjectTag.SPECIALIZED: 'اختصاصی',
    SubjectTag.ANALYTICAL: 'تحلیلی',
    SubjectTag.MEMORIZATION: 'حفظی',
}

#: بار شناختی پیش‌فرض وقتی مشاور در کاتالوگ درس مقداری تعیین نکرده باشد.
_DEFAULT_LOAD_BY_TAG: dict[SubjectTag, int] = {
    SubjectTag.ANALYTICAL: HEAVY_COGNITIVE_LOAD,
    SubjectTag.MEMORIZATION: 1,
}


def parse_tags(values) -> frozenset[SubjectTag]:
    """تبدیل فهرست رشته‌ای (ورودی API یا ستون JSON) به مجموعه‌ی تگ.

    مقادیر ناشناخته بی‌صدا نادیده گرفته می‌شوند: تگ یک ابرداده‌ی کمکی است و نبودش
    نباید کل برنامه‌ریزی را بشکند — موتور در نبود تگ به پیش‌فرض‌ها برمی‌گردد.
    """
    if not values:
        return frozenset()
    tags = set()
    for value in values:
        try:
            tags.add(SubjectTag(str(value).strip().lower()))
        except ValueError:
            continue
    return frozenset(tags)


def default_cognitive_load(tags: frozenset[SubjectTag]) -> int:
    """بار شناختی استنتاج‌شده از تگ‌ها؛ در نبود تگِ جنس یادگیری، متوسط (۲)."""
    loads = [_DEFAULT_LOAD_BY_TAG[tag] for tag in tags if tag in _DEFAULT_LOAD_BY_TAG]
    if not loads:
        return 2
    return max(loads)


__all__ = [
    'HEAVY_COGNITIVE_LOAD',
    'MAX_COGNITIVE_LOAD',
    'MIN_COGNITIVE_LOAD',
    'SubjectTag',
    'default_cognitive_load',
    'parse_tags',
]
