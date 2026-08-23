from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Final

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.modules.exam.models import ExamSession, ExamSessionStatus

logger = logging.getLogger(__name__)

DEFAULT_BATCH_SIZE: Final[int] = 50
DEFAULT_INTERVAL_SECONDS: Final[float] = 30.0


class ExamSessionStatusWorker:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
        *,
        interval_seconds: float = DEFAULT_INTERVAL_SECONDS,
        batch_size: int = DEFAULT_BATCH_SIZE,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        if interval_seconds <= 0:
            raise ValueError("interval_seconds must be greater than zero")
        if not 1 <= batch_size <= DEFAULT_BATCH_SIZE:
            raise ValueError(f"batch_size must be between 1 and {DEFAULT_BATCH_SIZE}")

        if session_factory is None:
            from src.core.database import AsyncSessionFactory

            session_factory = AsyncSessionFactory

        self._session_factory = session_factory
        self._interval_seconds = interval_seconds
        self._batch_size = batch_size
        self._clock = clock or (lambda: datetime.now(UTC))

    async def run_once(self, *, now: datetime | None = None) -> int:
        current_time = now or self._clock()
        if current_time.tzinfo is None or current_time.tzinfo.utcoffset(current_time) is None:
            raise ValueError("now must be timezone-aware")

        completed = await self._update_in_batches(
            from_statuses=(ExamSessionStatus.SCHEDULED, ExamSessionStatus.RUNNING),
            to_status=ExamSessionStatus.COMPLETED,
            due_filter=ExamSession._end_time <= current_time,
        )
        running = await self._update_in_batches(
            from_statuses=(ExamSessionStatus.SCHEDULED,),
            to_status=ExamSessionStatus.RUNNING,
            due_filter=(
                ExamSession._start_time <= current_time,
                ExamSession._end_time > current_time,
            ),
        )
        return completed + running

    async def _update_in_batches(
        self,
        *,
        from_statuses: tuple[ExamSessionStatus, ...],
        to_status: ExamSessionStatus,
        due_filter,
    ) -> int:
        updated_count = 0

        while True:
            async with self._session_factory() as session:
                async with session.begin():
                    ids = (
                        await session.scalars(
                            select(ExamSession.id)
                            .where(
                                ExamSession.status.in_(from_statuses),
                                *(
                                    due_filter
                                    if isinstance(due_filter, tuple)
                                    else (due_filter,)
                                ),
                            )
                            .order_by(ExamSession.id)
                            .limit(self._batch_size)
                            .with_for_update(skip_locked=True)
                        )
                    ).all()

                    if not ids:
                        return updated_count
                    
                    result = await session.execute(
                        update(ExamSession)
                        .where(
                            ExamSession.id.in_(ids),
                            ExamSession.status.in_(from_statuses),
                        )
                        .values(
                            status=to_status,
                            updated_at=func.now(),
                        )
                    )
                    batch_count = result.rowcount or 0

            updated_count += batch_count
            logger.info(
                "ExamSession status batch processed",
                extra={
                    "from_statuses": [status.value for status in from_statuses],
                    "to_status": to_status.value,
                    "count": batch_count,
                },
            )

            # A concurrent worker may have changed claimed rows. Continue
            # until no eligible rows remain rather than relying on rowcount.

    async def run_forever(self) -> None:
        logger.info(
            "ExamSession status worker started",
            extra={
                "interval_seconds": self._interval_seconds,
                "batch_size": self._batch_size,
            },
        )
        try:
            while True:
                try:
                    await self.run_once()
                except asyncio.CancelledError:
                    raise
                except Exception:
                    logger.exception("ExamSession status worker iteration failed")

                await asyncio.sleep(self._interval_seconds)
        finally:
            logger.info("ExamSession status worker stopped")


async def run_exam_session_status_worker(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    interval_seconds: float = DEFAULT_INTERVAL_SECONDS,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> None:
    """Convenience entry point for a process/supervisor-managed worker."""
    await ExamSessionStatusWorker(
        session_factory,
        interval_seconds=interval_seconds,
        batch_size=batch_size,
    ).run_forever()
