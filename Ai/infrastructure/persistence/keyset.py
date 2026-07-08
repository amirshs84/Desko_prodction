"""کمک‌ابزار صفحه‌بندی Keyset (Cursor) برای Repositoryها.

استراتژی: مرتب‌سازی پایدار بر اساس یک کلید مرکب ``(sort_field, id)`` و ادامه از
«بعد از آخرین آیتم صفحه‌ی قبل». چون ``id`` یکتا و ``UUIDv7`` زمان‌مرتب است،
tie-breaking قطعی و بدون رکورد تکراری/گمشده تضمین می‌شود.

این توابع مستقل از مدل‌اند؛ Repositoryهای concrete (لایه ۵) از آن‌ها برای ساخت
شرط ``WHERE (sort, id) < (?, ?)`` و تولید cursor استفاده می‌کنند.
"""
from __future__ import annotations

from typing import Any

from ...shared.domain.pagination import decode_cursor, encode_cursor


def build_cursor(*, sort_value: Any, last_id: str) -> str:
    """cursor را از کلید مرتب‌سازی آخرین آیتم می‌سازد."""
    return encode_cursor({"s": sort_value, "id": last_id})


def parse_cursor(cursor: str | None) -> tuple[Any, str] | None:
    """cursor را به ``(sort_value, id)`` رمزگشایی می‌کند؛ None یعنی صفحه‌ی اول."""
    if not cursor:
        return None
    data = decode_cursor(cursor)
    return data.get("s"), data.get("id")
