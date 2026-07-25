"""DjangoUnitOfWork — پیاده‌سازی Unit of Work روی تراکنش Django."""
from __future__ import annotations

from django.db import transaction


class DjangoUnitOfWork:
    """مرز تراکنش؛ کل بلاک درون ``transaction.atomic`` اجرا می‌شود (همه یا هیچ)."""

    def __init__(self) -> None:
        self._atomic = None

    def __enter__(self) -> 'DjangoUnitOfWork':
        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb) -> bool | None:
        return self._atomic.__exit__(exc_type, exc, tb)
