from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from typing import Final

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.modules.session.models import SessionAttempt, SessionAttemptStatus

logger = logging.getLogger(__name__)

DEFAULT_BATCH_SIZE: Final[int] = 500
DEFAULT_INTERVAL_SECONDS: Final[float] = 30.0


class SessionAttemptStatusWorker:
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
        if (
            current_time.tzinfo is None
            or current_time.tzinfo.utcoffset(current_time) is None
        ):
            raise ValueError("now must be timezone-aware")

        return await self._submit_expired_in_batches(current_time)

    async def _submit_expired_in_batches(self, current_time: datetime) -> int:
        submitted_count = 0

        while True:
            async with self._session_factory() as session:
                async with session.begin():
                    ids = (
                        await session.scalars(
                            select(SessionAttempt.id)
                            .where(
                                SessionAttempt.status
                                == SessionAttemptStatus.IN_PROGRESS,
                                SessionAttempt.expire_at <= current_time,
                            )
                            .order_by(SessionAttempt.expire_at, SessionAttempt.id)
                            .limit(self._batch_size)
                            .with_for_update(skip_locked=True)
                        )
                    ).all()

                    if not ids:
                        return submitted_count

                    result = await session.execute(
                        update(SessionAttempt)
                        .where(
                            SessionAttempt.id.in_(ids),
                            SessionAttempt.status
                            == SessionAttemptStatus.IN_PROGRESS,
                            SessionAttempt.expire_at <= current_time,
                        )
                        .values(
                            status=SessionAttemptStatus.SUBMITTED,
                            submitted_at=SessionAttempt.expire_at,
                            updated_at=func.now(),
                        )
                    )
                    batch_count = result.rowcount or 0

            submitted_count += batch_count
            logger.info(
                "SessionAttempt expiration batch processed",
                extra={
                    "to_status": SessionAttemptStatus.SUBMITTED.value,
                    "count": batch_count,
                },
            )

    async def run_forever(self) -> None:
        logger.info(
            "SessionAttempt status worker started",
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
                    logger.exception("SessionAttempt status worker iteration failed")

                await asyncio.sleep(self._interval_seconds)
        finally:
            logger.info("SessionAttempt status worker stopped")


async def run_session_attempt_status_worker(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    interval_seconds: float = DEFAULT_INTERVAL_SECONDS,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> None:
    """Convenience entry point for a process/supervisor-managed worker."""
    await SessionAttemptStatusWorker(
        session_factory,
        interval_seconds=interval_seconds,
        batch_size=batch_size,
    ).run_forever()
