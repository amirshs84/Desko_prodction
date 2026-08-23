from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.core.database import AsyncSqlAlchemyUoW
from src.core.exceptions import (
    AttemptNotGraded,
    ExamSessionNotComplete,
    ExamSessionNotFound,
    ExamSessionProblemNotFound,
    SessionAttemptNotFound,
    SessionWasCancelled,
)
from src.core.schemas import Page
from src.modules.exam.models import ExamSessionStatus
from src.modules.problem.database_schemas import MCQPublicPayloadSchema
from src.modules.session.database_schemas import MCQResponseDataSchema
from src.modules.session.models import SessionAttemptStatus


class GetAttemptQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    user_id: UUID


class GetAttemptResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    session_id: UUID
    status: SessionAttemptStatus
    started_at: datetime
    expire_at: datetime
    submitted_at: datetime | None


class GetAttemptQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: GetAttemptQueryParams,
    ) -> GetAttemptResult:
        async with self._uow as uow:
            attempt = await uow.attempt.get_summary(attempt_id=params.attempt_id)
            if attempt.user_id != params.user_id:
                is_creator = await uow.exam_session.is_created_by(
                    session_id=attempt.session_id,
                    user_id=params.user_id,
                )
                if not is_creator:
                    raise SessionAttemptNotFound()

        return GetAttemptResult(
            user_id=attempt.user_id,
            session_id=attempt.session_id,
            status=attempt.status,
            started_at=attempt.started_at,
            expire_at=attempt.expire_at,
            submitted_at=attempt.submitted_at,
        )


class GetAttemptAnswersQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    user_id: UUID


class AttemptAnswerContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema


class GetAttemptAnswersResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    answers: tuple[AttemptAnswerContent, ...]


class GetAttemptAnswersQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: GetAttemptAnswersQueryParams,
    ) -> GetAttemptAnswersResult:
        async with self._uow as uow:
            attempt = await uow.attempt.get_summary(attempt_id=params.attempt_id)
            if attempt.user_id != params.user_id:
                is_creator = await uow.exam_session.is_created_by(
                    session_id=attempt.session_id,
                    user_id=params.user_id,
                )
                if not is_creator:
                    raise SessionAttemptNotFound()

            answers = await uow.attempt.list_answers(attempt_id=params.attempt_id)

        return GetAttemptAnswersResult(
            answers=tuple(
                AttemptAnswerContent(
                    exam_session_problem_id=answer.exam_session_problem_id,
                    response_data=answer.response_data,
                )
                for answer in answers
            )
        )


class GetAttemptProblemsQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    user_id: UUID
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class AttemptProblemContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    type: str
    public_payload: MCQPublicPayloadSchema
    config: dict[str, Any]
    score: Decimal
    negative_score: Decimal
    order_index: int


class GetAttemptProblemsQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: GetAttemptProblemsQueryParams,
    ) -> Page[AttemptProblemContent]:
        async with self._uow as uow:
            attempt = await uow.attempt.get_summary(attempt_id=params.attempt_id)
            if attempt.user_id != params.user_id:
                raise SessionAttemptNotFound()
            page = await uow.exam_session.list_problem_details(
                session_id=attempt.session_id,
                limit=params.limit,
                offset=params.offset,
            )

        return Page[AttemptProblemContent](
            items=tuple(
                AttemptProblemContent(
                    id=problem.id,
                    type=problem.public_payload.type,
                    public_payload=problem.public_payload,
                    config=problem.config,
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


class GetAttemptResultQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    user_id: UUID


class AttemptResultAnswer(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema
    correct_option_id: int
    score: Decimal


class GetAttemptResultResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    attempt_id: UUID
    min_score: Decimal
    max_score: Decimal
    score: Decimal
    answers: tuple[AttemptResultAnswer, ...]


class GetAttemptResultQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: GetAttemptResultQueryParams,
    ) -> GetAttemptResultResult:
        async with self._uow as uow:
            attempt = await uow.attempt.get_result_summary(
                attempt_id=params.attempt_id,
            )
            if attempt.user_id != params.user_id:
                is_creator = await uow.exam_session.is_created_by(
                    session_id=attempt.session_id,
                    user_id=params.user_id,
                )
                if not is_creator:
                    raise SessionAttemptNotFound()
            session = await uow.exam_session.get_result_context(
                session_id=attempt.session_id,
            )
            if session.status is ExamSessionStatus.CANCELLED:
                raise SessionWasCancelled()

            if datetime.now(UTC) < session.end_time:
                raise ExamSessionNotComplete()
            
            is_graded = all(
                (
                    attempt.status is SessionAttemptStatus.FINISHED,
                    attempt.submitted_at is not None,
                    attempt.score is not None,
                    attempt.min_score is not None,
                    attempt.max_score is not None,
                )
            )
            
            if not is_graded:
                raise AttemptNotGraded()

            answers = await uow.attempt.list_answers(attempt_id=params.attempt_id)
            grading_data = await uow.exam_session.get_all_problem_grading_data(
                session_id=attempt.session_id,
            )
            grading_by_problem_id = {item.id: item for item in grading_data}
            result_answers: list[AttemptResultAnswer] = []
            for answer in answers:
                problem = grading_by_problem_id.get(answer.exam_session_problem_id)
                if problem is None:
                    raise ExamSessionProblemNotFound()
                if answer.score is None:
                    raise AttemptNotGraded()
                result_answers.append(
                    AttemptResultAnswer(
                        exam_session_problem_id=answer.exam_session_problem_id,
                        response_data=answer.response_data,
                        correct_option_id=problem.private_payload.correct_option_id,
                        score=answer.score,
                    )
                )
            result_answers.sort(
                key=lambda item: grading_by_problem_id[
                    item.exam_session_problem_id
                ].order_index
            )

        return GetAttemptResultResult(
            user_id=attempt.user_id,
            attempt_id=attempt.id,
            min_score=attempt.min_score,
            max_score=attempt.max_score,
            score=attempt.score,
            answers=tuple(result_answers),
        )


class ListSessionAttemptsQueryParams(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    requested_by: UUID
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class SessionAttemptListContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    user_id: UUID
    status: SessionAttemptStatus
    score: Decimal | None
    min_score: Decimal | None
    max_score: Decimal | None
    started_at: datetime
    expire_at: datetime
    submitted_at: datetime | None


class ListSessionAttemptsQuery:
    def __init__(self, uow: AsyncSqlAlchemyUoW) -> None:
        self._uow = uow

    async def execute(
        self,
        params: ListSessionAttemptsQueryParams,
    ) -> Page[SessionAttemptListContent]:
        async with self._uow as uow:
            if not await uow.exam_session.is_created_by(
                session_id=params.session_id,
                user_id=params.requested_by,
            ):
                raise ExamSessionNotFound()
            page = await uow.attempt.list_for_session(
                session_id=params.session_id,
                limit=params.limit,
                offset=params.offset,
            )
        return Page(
            items=tuple(
                SessionAttemptListContent(
                    attempt_id=item.id,
                    user_id=item.user_id,
                    status=item.status,
                    score=item.score,
                    min_score=item.min_score,
                    max_score=item.max_score,
                    started_at=item.started_at,
                    expire_at=item.expire_at,
                    submitted_at=item.submitted_at,
                )
                for item in page.items
            ),
            total=page.total,
            limit=page.limit,
            offset=page.offset,
        )

