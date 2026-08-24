from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.core.database import AsyncSqlAlchemyUoW
from src.core.schemas import Page
from src.core.exceptions import ExamSessionNotFound, ParticipantNotFound
from src.modules.exam.database_schemas import ExamConfigSchema
from src.modules.exam.models import ExamSessionStatus, SessionParticipantStatus
from src.modules.exam.schemas import ExamDetail, ExamSummary
from src.modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPublicPayloadSchema,
)
from src.modules.session.models import SessionAttemptStatus


class ListExamsQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    created_by: UUID
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class ListExamsQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(self, params: ListExamsQueryParams) -> Page[ExamSummary]:
        async with self._uow as uow:
            return await uow.exam.list_summaries(
                created_by=params.created_by,
                limit=params.limit,
                offset=params.offset,
            )


class GetExamQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID
    created_by: UUID


class GetExamQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(self, params: GetExamQueryParams) -> ExamDetail:
        async with self._uow as uow:
            return await uow.exam.get_detail(
                exam_id=params.exam_id,
                created_by=params.created_by,
            )


class ListExamSessionsQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID
    created_by: UUID
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class ExamSessionListContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    exam_id: UUID
    title: str
    description: str | None
    status: ExamSessionStatus
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None


class ListExamSessionsQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: ListExamSessionsQueryParams,
    ) -> Page[ExamSessionListContent]:
        async with self._uow as uow:
            await uow.exam.get_detail(
                exam_id=params.exam_id,
                created_by=params.created_by,
            )
            page = await uow.exam_session.list_summaries_for_exam(
                exam_id=params.exam_id,
                created_by=params.created_by,
                limit=params.limit,
                offset=params.offset,
            )
        return Page(
            items=tuple(
                ExamSessionListContent(
                    session_id=item.id,
                    exam_id=item.exam_id,
                    title=item.title,
                    description=item.description,
                    status=item.status,
                    start_time=item.start_time,
                    end_time=item.end_time,
                    cancelled_at=item.cancelled_at,
                )
                for item in page.items
            ),
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )


class ListMySessionsQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class MySessionContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    exam_id: UUID
    title: str
    description: str | None
    status: ExamSessionStatus
    config: ExamConfigSchema
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None
    attempt_id: UUID | None
    attempt_status: SessionAttemptStatus | None


class ListMySessionsQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: ListMySessionsQueryParams,
    ) -> Page[MySessionContent]:
        async with self._uow as uow:
            page = await uow.exam_session.list_participant_sessions(
                user_id=params.user_id,
                limit=params.limit,
                offset=params.offset,
            )
        return Page(
            items=tuple(
                MySessionContent(
                    session_id=row.id,
                    exam_id=row.exam_id,
                    title=row.title,
                    description=row.description,
                    status=row.status,
                    config=row.exam_config_snapshot,
                    start_time=row.start_time,
                    end_time=row.end_time,
                    cancelled_at=row.cancelled_at,
                    attempt_id=row.attempt_id,
                    attempt_status=row.attempt_status,
                )
                for row in page.items
            ),
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )


class GetExamSessionQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    requested_by: UUID


class GetExamSessionResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    exam_id: UUID
    title: str
    description: str | None
    status: ExamSessionStatus
    config: ExamConfigSchema
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None
    created_by: UUID


class GetExamSessionQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: GetExamSessionQueryParams,
    ) -> GetExamSessionResult:
        async with self._uow as uow:
            session = await uow.exam_session.get_accessible_summary(
                session_id=params.session_id,
                user_id=params.requested_by,
            )

        return GetExamSessionResult(
            session_id=session.id,
            exam_id=session.exam_id,
            title=session.title,
            description=session.description,
            status=session.status,
            config=session.exam_config_snapshot,
            start_time=session.start_time,
            end_time=session.end_time,
            cancelled_at=session.cancelled_at,
            created_by=session.created_by,
        )


class GetSessionParticipantsQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    requested_by: UUID
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class ParticipantContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    status: SessionParticipantStatus


class GetSessionParticipantsQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: GetSessionParticipantsQueryParams,
    ) -> Page[ParticipantContent]:
        async with self._uow as uow:
            if not await uow.exam_session.is_created_by(
                session_id=params.session_id,
                user_id=params.requested_by,
            ):
                raise ExamSessionNotFound()
            page = await uow.exam_session.list_participants(
                session_id=params.session_id,
                limit=params.limit,
                offset=params.offset,
            )

            return Page[ParticipantContent](
                items=tuple(
                    ParticipantContent(user_id=p.user_id, status=p.status)
                    for p in page.items
                ),
                total=page.total,
                limit=page.limit,
                offset=page.offset,
            )


class ProblemPreviewContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    type: str
    public_payload: MCQPublicPayloadSchema
    meta_data: MCQMetaDataSchema | None = None
    config: dict[str, Any]
    score: Decimal
    negative_score: Decimal
    order_index: int


class GetSessionProblemsQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    requested_by: UUID
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class GetSessionProblemsQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: GetSessionProblemsQueryParams,
    ) -> Page[ProblemPreviewContent]:
        async with self._uow as uow:
            is_creator = await uow.exam_session.is_created_by(
                session_id=params.session_id,
                user_id=params.requested_by,
            )
            if not is_creator:
                try:
                    participant = await uow.exam_session.get_participant(
                        session_id=params.session_id,
                        user_id=params.requested_by,
                    )
                except ParticipantNotFound as exc:
                    raise ExamSessionNotFound() from exc
                if participant.status is not SessionParticipantStatus.ASSIGNED:
                    raise ExamSessionNotFound()

            page = await uow.exam_session.list_problem_take_views(
                session_id=params.session_id,
                limit=params.limit,
                offset=params.offset,
            )

        return Page[ProblemPreviewContent](
            items=tuple(
                ProblemPreviewContent(
                    id=problem.id,
                    type="MCQ",
                    public_payload=problem.public_payload,
                    meta_data=None,
                    config=problem.config or {},
                    score=problem.score,
                    negative_score=problem.negative_score,
                    order_index=problem.order_index,
                )
                for problem in page.items
            ),
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )
