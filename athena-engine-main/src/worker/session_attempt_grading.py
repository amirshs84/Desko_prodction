from __future__ import annotations

import asyncio
import logging
from typing import Final
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.orm import selectinload

from src.modules.exam.repository import ExamSessionRepository
from src.modules.exam.schemas import ExamSessionProblemGradingData
from src.modules.session.models import (
    GradingDomainService,
    SessionAttempt,
    SessionAttemptStatus,
)

logger = logging.getLogger(__name__)

DEFAULT_BATCH_SIZE: Final[int] = 100
DEFAULT_INTERVAL_SECONDS: Final[float] = 10.0


class SessionAttemptGradingWorker:
    def __init__(
        self,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
        *,
        interval_seconds: float = DEFAULT_INTERVAL_SECONDS,
        batch_size: int = DEFAULT_BATCH_SIZE,
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
        self._grading_service = GradingDomainService()

    async def run_once(self) -> int:
        graded_count = 0
        failed_attempt_ids: set[UUID] = set()

        while True:
            async with self._session_factory() as session:
                async with session.begin():
                    attempts = await self._claim_batch(
                        session,
                        exclude_ids=failed_attempt_ids,
                    )
                    if not attempts:
                        return graded_count

                    grading_data_by_session: dict[
                        UUID,
                        dict[UUID, ExamSessionProblemGradingData],
                    ] = {}
                    batch_graded_count = 0
                    batch_failed_count = 0

                    for attempt in attempts:
                        attempt_id = attempt.id
                        session_id = attempt.session_id
                        try:
                            async with session.begin_nested():
                                problems_grading_data = (
                                    grading_data_by_session.get(session_id)
                                )
                                if problems_grading_data is None:
                                    problems_grading_data = (
                                        await self._get_problems_grading_data(
                                            session,
                                            session_id=session_id,
                                        )
                                    )
                                    grading_data_by_session[session_id] = (
                                        problems_grading_data
                                    )

                                self._grading_service.grade_attempt(
                                    attempt=attempt,
                                    problems_grading_data=problems_grading_data,
                                )
                                await session.flush()
                        except Exception:
                            batch_failed_count += 1
                            failed_attempt_ids.add(attempt_id)
                            logger.exception(
                                "SessionAttempt grading failed: attempt_id=%s",
                                attempt_id,
                                extra={"attempt_id": str(attempt_id)},
                            )
                        else:
                            batch_graded_count += 1
                            graded_count += 1

            logger.info(
                "SessionAttempt grading batch processed",
                extra={
                    "batch_size": len(attempts),
                    "graded_count": batch_graded_count,
                    "failed_count": batch_failed_count,
                },
            )

    async def _claim_batch(
        self,
        session: AsyncSession,
        *,
        exclude_ids: set[UUID] | None = None,
    ) -> list[SessionAttempt]:
        filters = [
            SessionAttempt.status == SessionAttemptStatus.SUBMITTED,
            SessionAttempt.score.is_(None),
        ]

        if exclude_ids:
            filters.append(SessionAttempt.id.notin_(exclude_ids))

        result = await session.scalars(
            select(SessionAttempt)
            .where(*filters)
            .options(selectinload(SessionAttempt._answers))
            .order_by(SessionAttempt.id)
            .limit(self._batch_size)
            .with_for_update(skip_locked=True)
        )
        return list(result.all())

    async def _get_problems_grading_data(
        self,
        session: AsyncSession,
        *,
        session_id: UUID,
    ) -> dict[UUID, ExamSessionProblemGradingData]:
        grading_data = await ExamSessionRepository(
            session
        ).get_all_problem_grading_data(session_id)
        return {data.id: data for data in grading_data}

    async def run_forever(self) -> None:
        logger.info(
            "SessionAttempt grading worker started",
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
                    logger.exception("SessionAttempt grading worker iteration failed")

                await asyncio.sleep(self._interval_seconds)
        finally:
            logger.info("SessionAttempt grading worker stopped")


async def run_session_attempt_grading_worker(
    *,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
    interval_seconds: float = DEFAULT_INTERVAL_SECONDS,
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> None:
    """Convenience entry point for a process/supervisor-managed worker."""
    await SessionAttemptGradingWorker(
        session_factory,
        interval_seconds=interval_seconds,
        batch_size=batch_size,
    ).run_forever()
