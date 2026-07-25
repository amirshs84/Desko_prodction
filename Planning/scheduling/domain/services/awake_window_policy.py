"""سیاست پنجره‌ی بیداری — بازه‌ی مجاز شبانه‌روز برای جای‌گذاری بلوک مطالعه.

طبق سند، هیچ بلوکی بیرون از ۰۶:۰۰ تا ۲۳:۰۰ گذاشته نمی‌شود. این قاعده به‌صورت یک
شیء سیاست (نه ثابت پراکنده در کد) مدل شده تا فردا بتوان آن را برای هر دانش‌آموز
شخصی‌سازی کرد بدون تغییر در use-case ها.

توجه: این محدودیت فقط بر مسیرهای «جای‌گذاری/جابه‌جایی بلوک» اعمال می‌شود. رویدادهای
ثابت مدرسه و رویدادهایی که دانش‌آموز از قبل ساخته، حتی اگر بیرون از پنجره باشند
معتبر می‌مانند؛ صرفاً در محاسبه‌ی ظرفیتِ داخل پنجره به حساب نمی‌آیند.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ..value_objects.time_range import TimeRange

AWAKE_WINDOW_START = '06:00'
AWAKE_WINDOW_END = '23:00'


@dataclass(frozen=True)
class AwakeWindowPolicy:
    window: TimeRange

    @classmethod
    def default(cls) -> 'AwakeWindowPolicy':
        return cls(TimeRange.from_clock(AWAKE_WINDOW_START, AWAKE_WINDOW_END))

    @property
    def capacity_minutes(self) -> int:
        return self.window.duration_minutes

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
                f'بلوک باید داخل پنجره‌ی بیداری ({self.window}) قرار بگیرد.',
                meta={
                    'window_start_minutes': self.window.start_minutes,
                    'window_end_minutes': self.window.end_minutes,
                    'slot_start_minutes': start_minutes,
                    'slot_end_minutes': end_minutes,
                },
            )
