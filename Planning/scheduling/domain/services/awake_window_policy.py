"""سیاست پنجره‌ی بیداری — بازه‌ی مجاز شبانه‌روز برای جای‌گذاری بلوک مطالعه.

پیش‌فرض ۰۷:۰۰ تا ۲۳:۰۰ است، اما هر دانش‌آموز پنجره‌ی خودش را دارد و می‌تواند آن را
ویرایش کند. به همین دلیل این قاعده یک شیء سیاست است نه ثابتِ پراکنده در کد: مقدارش
از مخزن خوانده می‌شود و use-case ها فقط با همین رابط کار می‌کنند.

توجه: این محدودیت فقط بر مسیرهای «جای‌گذاری/جابه‌جایی بلوک» اعمال می‌شود. رویدادهای
ثابت مدرسه و رویدادهایی که دانش‌آموز از قبل ساخته، حتی اگر بیرون از پنجره باشند
معتبر می‌مانند؛ صرفاً در محاسبه‌ی ظرفیتِ داخل پنجره به حساب نمی‌آیند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ..value_objects.time_range import TimeRange

AWAKE_WINDOW_START = '07:00'
AWAKE_WINDOW_END = '23:00'

#: کوتاه‌ترین پنجره‌ای که برنامه‌ریزی روی آن معنا دارد؛ زیر این مقدار یعنی کاربر
#: عملاً برنامه‌ریزی را خاموش کرده و بهتر است خطای صریح بگیرد تا برنامه‌ی خالی.
MIN_AWAKE_MINUTES = 4 * 60


@dataclass(frozen=True)
class AwakeWindowPolicy:
    window: TimeRange

    def __post_init__(self) -> None:
        if self.window.duration_minutes < MIN_AWAKE_MINUTES:
            raise ValidationError(
                f'بازه‌ی فعال باید دست‌کم {MIN_AWAKE_MINUTES // 60} ساعت باشد.',
                meta={
                    'window_start_minutes': self.window.start_minutes,
                    'window_end_minutes': self.window.end_minutes,
                    'min_minutes': MIN_AWAKE_MINUTES,
                },
            )

    # ---------- سازنده‌ها ----------

    @classmethod
    def default(cls) -> 'AwakeWindowPolicy':
        return cls(TimeRange.from_clock(AWAKE_WINDOW_START, AWAKE_WINDOW_END))

    @classmethod
    def from_minutes(cls, start_minutes: int, end_minutes: int) -> 'AwakeWindowPolicy':
        """ساخت از ورودی کاربر؛ خطای بازه را به پیام قابل‌فهم ترجمه می‌کند."""
        if not isinstance(start_minutes, int) or not isinstance(end_minutes, int):
            raise ValidationError('شروع و پایان بازه‌ی فعال باید عدد صحیح باشد.')
        if not 0 <= start_minutes < end_minutes <= 1440:
            raise ValidationError(
                'بازه‌ی فعال باید داخل یک شبانه‌روز و پایانش بعد از شروع باشد.',
                meta={'start_minutes': start_minutes, 'end_minutes': end_minutes},
            )
        return cls(TimeRange(start_minutes, end_minutes))

    @classmethod
    def from_clock(cls, start: str, end: str) -> 'AwakeWindowPolicy':
        return cls(TimeRange.from_clock(start, end))

    # ---------- ویژگی‌ها ----------

    @property
    def capacity_minutes(self) -> int:
        return self.window.duration_minutes

    @property
    def is_default(self) -> bool:
        return self.window == AwakeWindowPolicy.default().window

    def contains(self, slot: TimeRange) -> bool:
        return self.window.contains(slot)

    def ensure_contains(self, slot: TimeRange) -> None:
        self.ensure_fits(slot.start_minutes, slot.duration_minutes)

    def ensure_fits(self, start_minutes: int, duration_minutes: int) -> None:
        """کنترل پنجره پیش از ساخت ``TimeRange``.

        اگر اول بازه ساخته شود، بلوکی که از نیمه‌شب رد می‌شود خطای عمومی «بازه‌ی
        نامعتبر» می‌گیرد و کاربر نمی‌فهمد مشکل، پنجره‌ی بیداری بوده است.
        """
        end_minutes = start_minutes + duration_minutes
        if start_minutes < self.window.start_minutes or end_minutes > self.window.end_minutes:
            raise ValidationError(
                f'بلوک باید داخل بازه‌ی فعال ({self.window}) قرار بگیرد.',
                meta={
                    'window_start_minutes': self.window.start_minutes,
                    'window_end_minutes': self.window.end_minutes,
                    'slot_start_minutes': start_minutes,
                    'slot_end_minutes': end_minutes,
                },
            )
