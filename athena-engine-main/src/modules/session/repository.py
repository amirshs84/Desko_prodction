from uuid import UUID

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.exceptions import SessionAttemptNotFound
from src.core.schemas import Page
from src.modules.session.models import Answer, SessionAttempt
from src.modules.session.schemas import (
    AnswerView,
    SessionAttemptDetail,
    SessionAttemptListItem,
    SessionAttemptResultSummary,
    SessionAttemptSummary,
)


class SessionAttemptRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---------- Write Path ----------

    async def get_for_update(self, attempt_id: UUID) -> SessionAttempt:
        stmt = (
            select(SessionAttempt)
            .where(SessionAttempt.id == attempt_id)
            .options(
                selectinload(SessionAttempt._answers)
            )
            .with_for_update()
        )

        result = await self.session.execute(stmt)
        attempt = result.scalar_one_or_none()

        if attempt is None:
            raise SessionAttemptNotFound()

        return attempt

    async def get_for_answer_upsert(
        self,
        attempt_id: UUID,
        user_id: UUID,
        exam_session_problem_id: UUID,
    ) -> SessionAttempt:
        """
        Fetch the session attempt for answer upsert operations.
    
        This method intentionally loads `SessionAttempt._answers` partially,
        filtered only to the answer matching `exam_session_problem_id`.
    
        Do not use this method in code paths that need the full `_answers`
        collection or need to reason about all answered problems in the attempt.
        """
        stmt = (
            select(SessionAttempt)
            .where(
                SessionAttempt.id == attempt_id,
                SessionAttempt.user_id == user_id,
            )
            .options(
                selectinload(
                    SessionAttempt._answers.and_(
                        Answer.exam_session_problem_id == exam_session_problem_id
                    )
                )
            )
            .with_for_update()
            .execution_options(populate_existing=True)
        )

        attempt = (await self.session.execute(stmt)).scalar_one_or_none()
        if attempt is None:
            raise SessionAttemptNotFound()

        return attempt

    async def get_root_for_update(self, attempt_id: UUID) -> SessionAttempt:
        stmt = (
            select(SessionAttempt)
            .where(SessionAttempt.id == attempt_id)
            .with_for_update()
        )

        result = await self.session.execute(stmt)
        attempt = result.scalar_one_or_none()

        if attempt is None:
            raise SessionAttemptNotFound()

        return attempt

    def add(self, session_attempt: SessionAttempt) -> None:
        self.session.add(session_attempt)

    async def delete(self, session_attempt: SessionAttempt) -> None:
        await self.session.delete(session_attempt)

    # ---------- Read Path ----------

    async def get_summary(self, attempt_id: UUID) -> SessionAttemptSummary:
        stmt = select(
            SessionAttempt.id,
            SessionAttempt.user_id,
            SessionAttempt.session_id,
            SessionAttempt.participant_id,
            SessionAttempt.status,
            SessionAttempt.started_at,
            SessionAttempt.expire_at,
            SessionAttempt.submitted_at,
        ).where(SessionAttempt.id == attempt_id)
        
        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise SessionAttemptNotFound()

        return SessionAttemptSummary.model_validate(row)

    async def find_summary(
        self, session_id: UUID, user_id: UUID
    ) -> SessionAttemptSummary | None:
        stmt = select(
            SessionAttempt.id,
            SessionAttempt.user_id,
            SessionAttempt.session_id,
            SessionAttempt.participant_id,
            SessionAttempt.status,
            SessionAttempt.started_at,
            SessionAttempt.expire_at,
            SessionAttempt.submitted_at,
        ).where(
            SessionAttempt.session_id == session_id,
            SessionAttempt.user_id == user_id,
        )

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            return None

        return SessionAttemptSummary.model_validate(row)

    async def find_summary_by_id(
            self, attempt_id: UUID
        ) -> SessionAttemptSummary | None:
            stmt = select(
                SessionAttempt.id,
                SessionAttempt.user_id,
                SessionAttempt.session_id,
                SessionAttempt.participant_id,
                SessionAttempt.status,
                SessionAttempt.started_at,
                SessionAttempt.expire_at,
                SessionAttempt.submitted_at,
            ).where(
                SessionAttempt.id == attempt_id,
            )
    
            row = (await self.session.execute(stmt)).one_or_none()
            if row is None:
                return None
    
            return SessionAttemptSummary.model_validate(row)

    async def exists(self, attempt_id: UUID) -> bool:
        stmt = select(exists().where(SessionAttempt.id == attempt_id))
        return bool(await self.session.scalar(stmt))

    async def list_answers(self, attempt_id: UUID) -> tuple[AnswerView, ...]:
        stmt = (
            select(
                Answer.id,
                Answer.exam_session_problem_id,
                Answer.response_data,
                Answer.score,
                Answer.created_at,
            )
            .where(Answer.session_attempt_id == attempt_id)
            .order_by(Answer.created_at)
        )
        
        rows = (await self.session.execute(stmt)).all()
        
        return tuple(AnswerView.model_validate(row) for row in rows)

    async def get_detail(self, attempt_id: UUID) -> SessionAttemptDetail:
        attempt_stmt = select(
            SessionAttempt.id,
            SessionAttempt.user_id,
            SessionAttempt.session_id,
            SessionAttempt.participant_id,
            SessionAttempt.status,
            SessionAttempt.score,
            SessionAttempt.started_at,
            SessionAttempt.expire_at,
            SessionAttempt.submitted_at,
        ).where(SessionAttempt.id == attempt_id)
        
        attempt_row = (await self.session.execute(attempt_stmt)).one_or_none()
        if attempt_row is None:
            raise SessionAttemptNotFound()

        answers = await self.list_answers(attempt_id)

        return SessionAttemptDetail(
            id=attempt_row.id,
            user_id=attempt_row.user_id,
            session_id=attempt_row.session_id,
            participant_id=attempt_row.participant_id,
            status=attempt_row.status,
            score=attempt_row.score,
            started_at=attempt_row.started_at,
            expire_at=attempt_row.expire_at,
            submitted_at=attempt_row.submitted_at,
            answers=answers,
        )

    async def get_result_summary(
        self,
        attempt_id: UUID,
    ) -> SessionAttemptResultSummary:
        stmt = select(
            SessionAttempt.id,
            SessionAttempt.user_id,
            SessionAttempt.session_id,
            SessionAttempt.status,
            SessionAttempt.score,
            SessionAttempt.min_score,
            SessionAttempt.max_score,
            SessionAttempt.submitted_at,
        ).where(SessionAttempt.id == attempt_id)

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise SessionAttemptNotFound()

        return SessionAttemptResultSummary.model_validate(row)

    async def list_for_session(
        self,
        session_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> Page[SessionAttemptListItem]:
        filters = [SessionAttempt.session_id == session_id]
        stmt = (
            select(
                SessionAttempt.id,
                SessionAttempt.user_id,
                SessionAttempt.session_id,
                SessionAttempt.status,
                SessionAttempt.score,
                SessionAttempt.min_score,
                SessionAttempt.max_score,
                SessionAttempt.started_at,
                SessionAttempt.expire_at,
                SessionAttempt.submitted_at,
            )
            .where(*filters)
            .order_by(SessionAttempt.started_at.desc(), SessionAttempt.id.desc())
            .limit(limit)
            .offset(offset)
        )
        total_stmt = (
            select(func.count()).select_from(SessionAttempt).where(*filters)
        )
        rows = (await self.session.execute(stmt)).all()
        total = (await self.session.execute(total_stmt)).scalar_one()
        return Page(
            items=tuple(SessionAttemptListItem.model_validate(r) for r in rows),
            total=total,
            limit=limit,
            offset=offset,
        )
