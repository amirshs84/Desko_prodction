"""DjangoUnitOfWork — پیاده‌سازی Unit of Work روی تراکنش Django.

مسئولیت‌ها:
  1. مرز تراکنش: کل بلاک درون ``transaction.atomic`` اجرا می‌شود (همه یا هیچ).
  2. انتشار رویداد پس از commit: رویدادهای جمع‌آوری‌شده با
     ``transaction.on_commit`` ثبت می‌شوند تا فقط در صورت commit موفقِ نهایی
     (حتی با تراکنش‌های تودرتو/savepoint) منتشر شوند.

چرا on_commit به‌جای انتشار در __exit__؟ اگر در __exit__ منتشر کنیم، در تراکنش
تودرتو ممکن است بلاک بیرونی بعداً rollback شود در حالی‌که ما رویداد را منتشر
کرده‌ایم — منجر به رویداد «کاذب». on_commit این ناسازگاری را حذف می‌کند.
"""
from __future__ import annotations

import functools

from django.db import transaction

from ..application.ports.event_publisher import EventPublisher
from ..shared.domain.entity import AggregateRoot


class DjangoUnitOfWork:
    def __init__(self, event_publisher: EventPublisher) -> None:
        self._publisher = event_publisher
        self._atomic = None

    def __enter__(self) -> "DjangoUnitOfWork":
        self._atomic = transaction.atomic()
        self._atomic.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb) -> bool | None:
        # در صورت بروز خطا، atomic خودش rollback می‌کند و on_commitها اجرا نمی‌شوند.
        return self._atomic.__exit__(exc_type, exc, tb)

    def collect_events(self, aggregate: AggregateRoot) -> None:
        for event in aggregate.domain_events:
            transaction.on_commit(functools.partial(self._publisher.publish, event))
        aggregate.clear_events()
