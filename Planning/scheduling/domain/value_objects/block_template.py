"""الگوهای آماده‌ی بلوک مطالعه — «پنل بلوک‌ها» در تقویم مشاور.

مشاور به‌جای پر کردن فرم، یک بلوک آماده را از پنل کنار تقویم برمی‌دارد و روی روز
می‌اندازد. بلوک استاندارد ۹۰ دقیقه است و چند طول متداول دیگر هم در دسترس‌اند.

کاتالوگ فعلاً ثابت و درون‌کدی است چون هنوز مشاور آن را شخصی‌سازی نمی‌کند؛ اما پشت
همین Value Object و تابع ``get_template`` پنهان شده تا وقتی به جدول یا تنظیمات
مدرسه منتقل شد، مصرف‌کننده‌ها تغییر نکنند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import NotFoundError, ValidationError
from ....shared.domain.value_object import ValueObject

DEFAULT_BLOCK_MINUTES = 90
MIN_BLOCK_MINUTES = 5
MAX_BLOCK_MINUTES = 480


def ensure_valid_duration(duration_minutes: int) -> None:
    if not isinstance(duration_minutes, int) or duration_minutes < MIN_BLOCK_MINUTES:
        raise ValidationError(
            f'طول بلوک باید حداقل {MIN_BLOCK_MINUTES} دقیقه باشد.',
            meta={'duration_minutes': duration_minutes},
        )
    if duration_minutes > MAX_BLOCK_MINUTES:
        raise ValidationError(
            f'طول بلوک نباید بیش از {MAX_BLOCK_MINUTES} دقیقه باشد.',
            meta={'duration_minutes': duration_minutes},
        )


@dataclass(frozen=True)
class BlockTemplate(ValueObject):
    key: str
    title: str
    duration_minutes: int
    color: str

    def __post_init__(self) -> None:
        ensure_valid_duration(self.duration_minutes)


BLOCK_TEMPLATES: tuple[BlockTemplate, ...] = (
    BlockTemplate('study_90', 'مطالعه', DEFAULT_BLOCK_MINUTES, '#10b981'),
    BlockTemplate('review_45', 'مرور', 45, '#3b82f6'),
    BlockTemplate('test_60', 'تست‌زنی', 60, '#f59e0b'),
    BlockTemplate('deep_120', 'مطالعه‌ی عمیق', 120, '#8b5cf6'),
    BlockTemplate('rest_30', 'استراحت', 30, '#94a3b8'),
)

_BY_KEY = {template.key: template for template in BLOCK_TEMPLATES}


def get_template(key: str) -> BlockTemplate:
    template = _BY_KEY.get(key)
    if template is None:
        raise NotFoundError(
            'الگوی بلوک مورد نظر وجود ندارد.',
            meta={'key': key, 'available': sorted(_BY_KEY)},
        )
    return template
