from collections.abc import Collection
from decimal import Decimal
from uuid import UUID
from typing import Any, Sequence

from sqlalchemy import func, select, exists
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from modules.exam.models import (
    Exam,
    ExamProblem,
    ExamStatus,

    ExamSession,
    ExamSessionProblem,
    SessionParticipant,
    SessionParticipantStatus,
)
from src.modules.exam.schemas import (
    Page,

    ExamSummary,
    ExamDetail,
    ExamProblemView,

    ExamSessionSummary,
    SessionParticipantView,
    ExamSessionProblemDetail,
    ExamSessionProblemPublicView,
    ExamSessionProblemPrivateView,
    ExamSessionProblemMetaDataView,
    ExamSessionProblemConfigView,
    ExamSessionProblemGradingData,
)
from src.core.exceptions import (
    ExamNotFound,
    ExamSessionNotFound,
    ExamSessionProblemNotFound,
    ParticipantNotFound,
)


class ExamRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---------- write ----------

    async def get_for_update(self, exam_id: UUID) -> Exam:
        stmt = (
            select(Exam)
            .where(Exam.id == exam_id)
            .options(selectinload(Exam._exam_problems))
            .with_for_update()
        )
        exam = (await self.session.execute(stmt)).scalar_one_or_none()
        if exam is None:
            raise ExamNotFound()
        return exam

    def add(self, exam: Exam) -> None:
        self.session.add(exam)

    def delete(self, exam: Exam) -> None:
        self.session.delete(exam)

    # ---------- read ----------

    async def get_detail(self, exam_id: UUID) -> ExamDetail:
        exam_stmt = select(
            Exam.id, Exam.title, Exam.description, Exam.status, Exam.config
        ).where(Exam.id == exam_id)
        row = (await self.session.execute(exam_stmt)).one_or_none()
        if row is None:
            raise ExamNotFound()

        problems_stmt = (
            select(
                ExamProblem.id,
                ExamProblem.problem_id,
                ExamProblem.order_index,
                ExamProblem.score,
                ExamProblem.negative_score,
                ExamProblem.config,
            )
            .where(ExamProblem.exam_id == exam_id)
            .order_by(ExamProblem.order_index)
        )
        problems = tuple(
            ExamProblemView(
                id=r.id,
                problem_id=r.problem_id,
                order_index=r.order_index,
                score=r.score,
                negative_score=r.negative_score,
                config=r.config,
            )
            for r in (await self.session.execute(problems_stmt)).all()
        )

        return ExamDetail(
            id=row.id,
            title=row.title,
            description=row.description,
            status=row.status,
            config=row.config,
            total_score=sum((p.score for p in problems), Decimal("0.00")),
            problems=problems,
        )

    async def list_summaries(
        self,
        *,
        statuses: Collection[ExamStatus] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[ExamSummary]:
        problem_count = (
            select(func.count(ExamProblem.id))
            .where(ExamProblem.exam_id == Exam.id)
            .correlate(Exam)
            .scalar_subquery()
        )

        filters = []
        if statuses:
            filters.append(Exam.status.in_(tuple(statuses)))

        stmt = (
            select(Exam.id, Exam.title, Exam.status, Exam.created_at,
                   problem_count.label("problem_count"))
            .where(*filters)
            .order_by(Exam.created_at.desc(), Exam.id.desc())
            .limit(limit)
            .offset(offset)
        )
        total_stmt = select(func.count()).select_from(Exam).where(*filters)

        rows = (await self.session.execute(stmt)).all()
        total = (await self.session.execute(total_stmt)).scalar_one()

        return Page(
            items=tuple(
                ExamSummary(
                    id=r.id, title=r.title, status=r.status,
                    problem_count=r.problem_count, created_at=r.created_at,
                )
                for r in rows
            ),
            total=total,
            limit=limit,
            offset=offset,
        )

    async def exists(self, exam_id: UUID) -> bool:
        stmt = select(select(Exam.id).where(Exam.id == exam_id).exists())
        return bool((await self.session.execute(stmt)).scalar_one())

    async def get_status(self, exam_id: UUID) -> ExamStatus:
        stmt = select(Exam.status).where(Exam.id == exam_id)
        status = (await self.session.execute(stmt)).scalar_one_or_none()
        if status is None:
            raise ExamNotFound()
        return status

    async def list_problem_ids(self, exam_id: UUID) -> tuple[UUID, ...]:
        stmt = (
            select(ExamProblem.problem_id)
            .where(ExamProblem.exam_id == exam_id)
            .order_by(ExamProblem.order_index)
        )
        return tuple((await self.session.execute(stmt)).scalars().all())


class ExamSessionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---------- write ----------

    async def get_for_update(self, session_id: UUID) -> ExamSession:
        stmt = (
            select(ExamSession)
            .where(ExamSession.id == session_id)
            .options(
                selectinload(ExamSession._session_participants),
                selectinload(ExamSession._exam_session_problems),
            )
            .with_for_update()
        )
        
        result = await self.session.execute(stmt)
        session = result.scalar_one_or_none()
        
        if session is None:
            raise ExamSessionNotFound()
            
        return session

    def add(self, exam_session: ExamSession) -> None:
        self.session.add(exam_session)

    async def delete(self, exam_session: ExamSession) -> None:
        await self.session.delete(exam_session)

    # ---------- read ----------

    async def get_summary(self, session_id: UUID) -> ExamSessionSummary:
        stmt = select(
            ExamSession.id,
            ExamSession.exam_id,
            ExamSession.title,
            ExamSession.status,
            ExamSession.exam_config_snapshot,
            ExamSession._start_time.label("start_time"),
            ExamSession._end_time.label("end_time"),
            ExamSession.cancelled_at,
        ).where(ExamSession.id == session_id)

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise ExamSessionNotFound()

        return ExamSessionSummary.model_validate(row)

    # ---------- read: participants ----------

    async def get_participant(
        self,
        session_id: UUID,
        user_id: UUID,
    ) -> SessionParticipantView:
        stmt = select(
            SessionParticipant.id,
            SessionParticipant.exam_session_id.label("session_id"),
            SessionParticipant.user_id,
            SessionParticipant.status,
        ).where(
            SessionParticipant.exam_session_id == session_id,
            SessionParticipant.user_id == user_id,
        )

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise ParticipantNotFound()

        return SessionParticipantView.model_validate(row)

    async def list_participants(
        self,
        session_id: UUID,
        *,
        statuses: Collection[SessionParticipantStatus] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[SessionParticipantView]:
        filters = [SessionParticipant.exam_session_id == session_id]
        if statuses:
            filters.append(SessionParticipant.status.in_(tuple(statuses)))

        stmt = (
            select(
                SessionParticipant.id,
                SessionParticipant.exam_session_id.label("session_id"),
                SessionParticipant.user_id,
                SessionParticipant.status,
            )
            .where(*filters)
            .order_by(SessionParticipant.id)
            .limit(limit)
            .offset(offset)
        )
        total_stmt = (
            select(func.count()).select_from(SessionParticipant).where(*filters)
        )

        rows = (await self.session.execute(stmt)).all()
        total = (await self.session.execute(total_stmt)).scalar_one()

        return Page(
            items=tuple(SessionParticipantView.model_validate(r) for r in rows),
            total=total,
            limit=limit,
            offset=offset,
        )

    # ---------- read: session problems ----------

    async def get_problem_detail(
        self,
        session_id: UUID,
        problem_id: UUID,
    ) -> ExamSessionProblemDetail:
        stmt = select(*self._DETAIL_COLUMNS).where(
            ExamSessionProblem.exam_session_id == session_id,
            ExamSessionProblem.id == problem_id,
        )
        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise ExamSessionProblemNotFound()
        return ExamSessionProblemDetail.model_validate(row)

    async def problem_exists_in_session(
        self,
        session_id: UUID,
        problem_id: UUID,
    ) -> bool:
        stmt = select(
            exists().where(
                ExamSessionProblem.exam_session_id == session_id,
                ExamSessionProblem.id == problem_id,
            )
        )
        return bool(await self.session.scalar(stmt))

    async def list_problem_details(
        self,
        session_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[ExamSessionProblemDetail]:
        rows, total = await self._fetch_problem_rows(
            session_id=session_id,
            columns=self._DETAIL_COLUMNS,
            limit=limit,
            offset=offset,
        )
        return Page(
            items=tuple(ExamSessionProblemDetail.model_validate(r) for r in rows),
            total=total,
            limit=limit,
            offset=offset,
        )

    async def list_problem_public_views(
        self,
        session_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[ExamSessionProblemPublicView]:
        rows, total = await self._fetch_problem_rows(
            session_id=session_id,
            columns=(
                *self._IDENTITY_COLUMNS,
                ExamSessionProblem.public_payload_snapshot.label("public_payload"),
            ),
            limit=limit,
            offset=offset,
        )
        return Page(
            items=tuple(ExamSessionProblemPublicView.model_validate(r) for r in rows),
            total=total,
            limit=limit,
            offset=offset,
        )

    async def list_problem_private_views(
        self,
        session_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[ExamSessionProblemPrivateView]:
        rows, total = await self._fetch_problem_rows(
            session_id=session_id,
            columns=(
                *self._IDENTITY_COLUMNS,
                ExamSessionProblem.private_payload_snapshot.label("private_payload"),
            ),
            limit=limit,
            offset=offset,
        )
        return Page(
            items=tuple(ExamSessionProblemPrivateView.model_validate(r) for r in rows),
            total=total,
            limit=limit,
            offset=offset,
        )

    async def list_problem_meta_data_views(
        self,
        session_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[ExamSessionProblemMetaDataView]:
        rows, total = await self._fetch_problem_rows(
            session_id=session_id,
            columns=(
                *self._IDENTITY_COLUMNS,
                ExamSessionProblem.meta_data_snapshot.label("meta_data"),
            ),
            limit=limit,
            offset=offset,
        )
        return Page(
            items=tuple(ExamSessionProblemMetaDataView.model_validate(r) for r in rows),
            total=total,
            limit=limit,
            offset=offset,
        )

    async def list_problem_config_views(
        self,
        session_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[ExamSessionProblemConfigView]:
        rows, total = await self._fetch_problem_rows(
            session_id=session_id,
            columns=(
                *self._IDENTITY_COLUMNS,
                ExamSessionProblem.config_snapshot.label("config"),
                ExamSessionProblem.score_snapshot.label("score"),
                ExamSessionProblem.negative_score_snapshot.label("negative_score"),
                ExamSessionProblem.order_index_snapshot.label("order_index"),
            ),
            limit=limit,
            offset=offset,
        )
        return Page(
            items=tuple(ExamSessionProblemConfigView.model_validate(r) for r in rows),
            total=total,
            limit=limit,
            offset=offset,
        )

    async def get_problem_grading_data(
            self,
            session_id: UUID,
            problem_id: UUID,
        ) -> ExamSessionProblemGradingData:
            stmt = select(*self._GRADING_COLUMNS).where(
                ExamSessionProblem.exam_session_id == session_id,
                ExamSessionProblem.id == problem_id,
            )
            row = (await self.session.execute(stmt)).one_or_none()
            if row is None:
                raise ExamSessionProblemNotFound()
            return ExamSessionProblemGradingData.model_validate(row)

    async def get_all_problem_grading_data(
        self,
        session_id: UUID,
    ) -> tuple[ExamSessionProblemGradingData, ...]:
        stmt = (
            select(*self._GRADING_COLUMNS)
            .where(ExamSessionProblem.exam_session_id == session_id)
            .order_by(ExamSessionProblem.order_index_snapshot)
        )
        rows = (await self.session.execute(stmt)).all()
        return tuple(
            ExamSessionProblemGradingData.model_validate(r) for r in rows
        )

    # ---------- internals ----------

    _IDENTITY_COLUMNS = (
        ExamSessionProblem.id,
        ExamSessionProblem.exam_session_id.label("session_id"),
        ExamSessionProblem.exam_problem_id,
    )

    _DETAIL_COLUMNS = (
        *_IDENTITY_COLUMNS,
        ExamSessionProblem.public_payload_snapshot.label("public_payload"),
        ExamSessionProblem.private_payload_snapshot.label("private_payload"),
        ExamSessionProblem.meta_data_snapshot.label("meta_data"),
        ExamSessionProblem.config_snapshot.label("config"),
        ExamSessionProblem.score_snapshot.label("score"),
        ExamSessionProblem.negative_score_snapshot.label("negative_score"),
        ExamSessionProblem.order_index_snapshot.label("order_index"),
        ExamSessionProblem.created_at,
    )

    _GRADING_COLUMNS = (
        *_IDENTITY_COLUMNS,
        ExamSessionProblem.private_payload_snapshot.label("private_payload"),
        ExamSessionProblem.score_snapshot.label("score"),
        ExamSessionProblem.negative_score_snapshot.label("negative_score"),
        ExamSessionProblem.order_index_snapshot.label("order_index"),
    )

    async def _fetch_problem_rows(
        self,
        *,
        session_id: UUID,
        columns: Sequence[Any],
        limit: int,
        offset: int,
    ) -> tuple[Sequence[Any], int]:
        where = ExamSessionProblem.exam_session_id == session_id

        stmt = (
            select(*columns)
            .where(where)
            .order_by(ExamSessionProblem.order_index_snapshot)
            .limit(limit)
            .offset(offset)
        )
        total_stmt = (
            select(func.count()).select_from(ExamSessionProblem).where(where)
        )

        rows = (await self.session.execute(stmt)).all()
        total = (await self.session.execute(total_stmt)).scalar_one()
        return rows, total