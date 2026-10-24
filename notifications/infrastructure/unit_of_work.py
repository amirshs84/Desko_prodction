"""Unit of Work روی تراکنش Django؛ callbackها (مثل صف‌کردن ارسال) فقط بعد از commit اجرا می‌شوند."""
from __future__ import annotations

from collections.abc import Callable

from django.db import transaction


class DjangoUnitOfWork:
    def __init__(self) -> None:
        self._atomic = None

    def __enter__(self) -> "DjangoUnitOfWork":
        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb) -> bool | None:
        return self._atomic.__exit__(exc_type, exc, tb)

    def on_commit(self, callback: Callable[[], None]) -> None:
        transaction.on_commit(callback)
