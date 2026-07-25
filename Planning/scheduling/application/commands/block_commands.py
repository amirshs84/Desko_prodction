"""Command های جای‌گذاری و جابه‌جایی بلوک روی تقویم.

این‌ها مسیر «درگ‌ودراپ» هستند و با ``UpdateEventCommand`` (مسیر فرم/ویرایش) فرق
دارند: اینجا کاربر یک نقطه‌ی زمانی *پیشنهاد* می‌دهد و سرور تصمیم نهایی را می‌گیرد
(تداخل، پنجره‌ی بیداری، snap).
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.application.cqrs import Command
from ....shared.domain.errors import ValidationError
from ...domain.value_objects.jalali_date import JalaliDate


@dataclass(frozen=True)
class PlaceBlockCommand(Command):
    """گذاشتن یک بلوک تازه روی یک روز.

    ``preferred_start_minutes`` جایی است که کاربر بلوک را رها کرده؛ ``None`` یعنی
    «هرجا که جا شد». با ``snap=False`` اگر همان نقطه آزاد نباشد خطا برمی‌گردد.
    """

    owner_id: int
    date: JalaliDate
    duration_minutes: int
    title: str
    color: str = ''
    description: str = ''
    group_id: str = ''
    preferred_start_minutes: int | None = None
    snap: bool = True
    client_id: str = ''

    def __post_init__(self) -> None:
        if self.preferred_start_minutes is not None and self.preferred_start_minutes < 0:
            raise ValidationError('زمان شروع پیشنهادی نمی‌تواند منفی باشد.')


@dataclass(frozen=True)
class MoveBlockCommand(Command):
    """جابه‌جایی یک رویداد موجود به روز/ساعت دیگر (drag & drop).

    ``expected_version`` نسخه‌ای است که UI هنگام شروع درگ در دست داشت؛ اگر در این
    فاصله کسی همان رویداد را جابه‌جا کرده باشد، به‌جای بازنویسی خاموش،
    ``CONCURRENCY_CONFLICT`` می‌گیرد.
    """

    owner_id: int
    client_id: str
    date: JalaliDate | None = None
    start_minutes: int | None = None
    snap: bool = True
    expected_version: int | None = None

    def __post_init__(self) -> None:
        if self.date is None and self.start_minutes is None:
            raise ValidationError('برای جابه‌جایی باید تاریخ یا ساعت مقصد را بفرستید.')
        if self.start_minutes is not None and self.start_minutes < 0:
            raise ValidationError('زمان شروع مقصد نمی‌تواند منفی باشد.')
