"""خواندن پارامترهای پرس‌وجو با پیام خطای یکدست.

جدا شده تا هر view مجبور نباشد قواعد تجزیه‌ی تاریخ شمسی و عدد را از نو بنویسد.
"""
from __future__ import annotations

from ...scheduling.domain.value_objects.jalali_date import JalaliDate
from ...shared.domain.errors import ValidationError


def parse_optional_int(request, key: str) -> int | None:
    raw = request.query_params.get(key)
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError as exc:
        raise ValidationError(f'پارامتر {key} باید عدد باشد.') from exc


def parse_optional_date(request, key: str) -> JalaliDate | None:
    """تاریخ شمسی به شکل ``1404-05-03``."""
    raw = request.query_params.get(key)
    if not raw:
        return None
    return parse_jalali_date(raw, key)


def parse_required_date(request, key: str) -> JalaliDate:
    date = parse_optional_date(request, key)
    if date is None:
        raise ValidationError(f'پارامتر {key} الزامی است.')
    return date


def parse_jalali_date(raw: str, key: str = 'date') -> JalaliDate:
    parts = raw.split('-')
    if len(parts) != 3 or not all(part.isdigit() for part in parts):
        raise ValidationError(f'پارامتر {key} باید به شکل 1404-05-03 باشد.')
    return JalaliDate(*(int(part) for part in parts))
