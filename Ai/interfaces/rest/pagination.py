"""کمکی‌های صفحه‌بندی برای لایه‌ی REST.

پارامترهای ``cursor`` و ``limit`` را از query می‌خواند (با سقف امن) و یک پاکت
یکنواخت برای خروجی صفحه‌بندی‌شده می‌سازد.
"""
from __future__ import annotations

from ...shared.domain.pagination import Page

_DEFAULT_LIMIT = 20
_MAX_LIMIT = 100


def parse_pagination(request) -> tuple[str | None, int]:
    cursor = request.query_params.get("cursor") or None
    raw_limit = request.query_params.get("limit")
    limit = _DEFAULT_LIMIT
    if raw_limit is not None:
        try:
            limit = int(raw_limit)
        except (TypeError, ValueError):
            limit = _DEFAULT_LIMIT
    limit = max(1, min(limit, _MAX_LIMIT))
    return cursor, limit


def parse_order(request, *, default: str = "asc") -> str:
    order = (request.query_params.get("order") or default).strip().lower()
    return order if order in {"asc", "desc"} else default


def page_envelope(page: Page, items: list) -> dict:
    return {
        "items": items,
        "page": {
            "next_cursor": page.next_cursor,
            "has_more": page.has_more,
            "limit": page.limit,
        },
    }
