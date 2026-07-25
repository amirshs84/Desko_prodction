"""Use-case های نسخه‌گیری و بازگردانی تقویم.

سیاست نگه‌داری: فقط ``SNAPSHOT_RETENTION`` نسخه‌ی آخر هر دانش‌آموز می‌ماند. هرس‌کردن
بلافاصله بعد از ثبت نسخه انجام می‌شود تا نیازی به job زمان‌بندی‌شده نباشد.
"""
from __future__ import annotations

from typing import Callable

from ....shared.application.context import RequestContext
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError
from ...domain.entities.calendar_snapshot import CalendarSnapshot, SnapshotReason
from ...domain.repositories.calendar_event_repository import CalendarEventRepository
from ...domain.repositories.snapshot_repository import CalendarSnapshotRepository

SNAPSHOT_RETENTION = 10


class SnapshotService:
    def __init__(
        self,
        *,
        events: CalendarEventRepository,
        snapshots: CalendarSnapshotRepository,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._events = events
        self._snapshots = snapshots
        self._uow_factory = uow_factory

    def capture(
        self, owner_id: int, *, reason: str = SnapshotReason.MANUAL, plan_run_id: str = '',
    ) -> CalendarSnapshot:
        """ثبت نسخه از کل تقویم دانش‌آموز (بدون تراکنش مستقل؛ در تراکنش فراخوان می‌نشیند)."""
        events = self._events.list_for_owner(owner_id)
        snapshot = self._snapshots.add(
            CalendarSnapshot(
                owner_id=owner_id,
                reason=reason,
                plan_run_id=plan_run_id,
                events=tuple(events),
            )
        )
        self._snapshots.prune(owner_id, keep=SNAPSHOT_RETENTION)
        return snapshot

    def list_snapshots(self, owner_id: int, *, limit: int = SNAPSHOT_RETENTION) -> list[CalendarSnapshot]:
        return self._snapshots.list_for_owner(owner_id, limit=limit)

    def restore(
        self, snapshot_id: int, owner_id: int, *, context: RequestContext,
    ) -> tuple[CalendarSnapshot, int]:
        """بازگرداندن تقویم به یک نسخه؛ تعداد رویدادهای بازگردانده‌شده را برمی‌گرداند.

        پیش از بازگردانی، خودِ وضعیت فعلی هم نسخه می‌شود تا «بازگردانیِ اشتباه» هم
        قابل برگشت باشد.
        """
        if context.authority not in (WriteAuthority.CONSULTANT, WriteAuthority.STUDENT):
            raise PermissionDeniedError('بازگردانی تقویم فقط توسط مشاور یا خود دانش‌آموز انجام می‌شود.')

        snapshot = self._snapshots.get(snapshot_id, owner_id=owner_id)
        restorable = snapshot.restorable_events
        with self._uow_factory():
            self.capture(owner_id, reason=SnapshotReason.RESTORE)
            self._events.delete_mutable_for_owner(owner_id)
            for event in restorable:
                event.persisted_version = None
            self._events.add_many(restorable)
        return snapshot, len(restorable)
