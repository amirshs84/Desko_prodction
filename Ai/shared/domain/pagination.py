"""Pagination خالص — استراتژی Cursor (Keyset).

چرا Cursor و نه Offset؟ در صفحات عمیق (کاربری با هزاران مکالمه) OFFSET کند و با
داده‌ی realtime ناسازگار می‌شود؛ Keyset همیشه O(limit) و پایدار است.

Cursor یک payload کوچک است که «کلید مرتب‌سازی آخرین آیتم» را حمل می‌کند و به
صورت base64(JSON) کدگذاری می‌شود تا برای کلاینت مبهم (opaque) بماند.
"""
from __future__ import annotations

import base64
import json
from dataclasses import dataclass, field
from typing import Any, Generic, Sequence, TypeVar

T = TypeVar("T")


@dataclass(frozen=True)
class Page(Generic[T]):
    """نتیجه‌ی صفحه‌بندی‌شده‌ی مستقل از فریمورک."""

    items: Sequence[T]
    next_cursor: str | None = None
    has_more: bool = False
    limit: int = 20


def encode_cursor(payload: dict[str, Any]) -> str:
    """کدگذاری کلید مرتب‌سازی به یک رشته‌ی مبهم و امن برای URL."""
    raw = json.dumps(payload, separators=(",", ":"), default=str).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii")


def decode_cursor(cursor: str) -> dict[str, Any]:
    """رمزگشایی cursor؛ در صورت خرابی، ورودی نامعتبر تلقی می‌شود."""
    raw = base64.urlsafe_b64decode(cursor.encode("ascii"))
    return json.loads(raw)
