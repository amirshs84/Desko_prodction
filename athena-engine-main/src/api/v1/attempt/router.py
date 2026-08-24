from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from src.core.security import CurrentUserDep
from src.core.schemas import Page
from src.modules.session.query import (
    GetAttemptAnswersQueryParams,
    GetAttemptProblemsQueryParams,
    GetAttemptQueryParams,
    GetAttemptResultQueryParams,
    ListSessionAttemptsQueryParams,
)
from src.modules.session.service import StartAttemptCommand, SendAnswerCommand, SubmitAttemptCommand
from src.api.v1.attempt.schemas import (
    AttemptAnswerContent,
    AttemptProblemContent,
    GetAttemptAnswersResponse,
    GetAttemptResponse,
    StartAttemptResponse,
    SendAnswerRequest,
    SendAnswerResponse,
    GetAttemptResultResponse,
    SessionAttemptListContent,
)
from src.api.v1.attempt.dependencies import (
    GetAttemptAnswersQueryDep,
    GetAttemptProblemsQueryDep,
    GetAttemptQueryDep,
    GetAttemptResultQueryDep,
    ListSessionAttemptsQueryDep,
    StartAttemptServiceDep,
    SendAnswerServiceDep,
    SubmitAttemptServiceDep,
)

router = APIRouter(tags=["SessionAttempts"])


@router.post(
    "/sessions/{session_id}/attempts",
    response_model=StartAttemptResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_attempt(
    session_id: UUID,
    user_id: CurrentUserDep,
    service: StartAttemptServiceDep,
) -> StartAttemptResponse:
    result = await service.execute(
        StartAttemptCommand(
            session_id=session_id,
            user_id=user_id,
        )
    )

    return StartAttemptResponse(**result.model_dump())


@router.put(
    "/attempts/{attempt_id}/answers",
    response_model=SendAnswerResponse,
    status_code=status.HTTP_200_OK,
)
async def send_answer(
    attempt_id: UUID,
    user_id: CurrentUserDep,
    service: SendAnswerServiceDep,
    request: SendAnswerRequest,
) -> SendAnswerResponse:
    result = await service.execute(
        SendAnswerCommand(
            attempt_id=attempt_id,
            user_id=user_id,
            exam_session_problem_id=request.exam_session_problem_id,
            response_data=request.response_data,
        )
    )

    return SendAnswerResponse(**result.model_dump())


@router.post(
    "/attempts/{attempt_id}/submit",
    status_code=status.HTTP_202_ACCEPTED,
)
async def submit_attempt(
    attempt_id: UUID,
    user_id: CurrentUserDep,
    service: SubmitAttemptServiceDep,
) -> None:
    await service.execute(
        SubmitAttemptCommand(
            user_id=user_id,
            attempt_id=attempt_id,
        )
    )


@router.get(
    "/sessions/{session_id}/attempts",
    response_model=Page[SessionAttemptListContent],
    status_code=status.HTTP_200_OK,
)
async def list_session_attempts(
    session_id: UUID,
    user_id: CurrentUserDep,
    query: ListSessionAttemptsQueryDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[SessionAttemptListContent]:
    result = await query.execute(
        ListSessionAttemptsQueryParams(
            session_id=session_id,
            requested_by=user_id,
            limit=limit,
            offset=offset,
        )
    )
    return Page[SessionAttemptListContent](
        items=tuple(
            SessionAttemptListContent(
                attempt_id=item.attempt_id,
                user_id=item.user_id,
                status=item.status,
                score=item.score,
                min_score=item.min_score,
                max_score=item.max_score,
                started_at=item.started_at,
                expire_at=item.expire_at,
                submitted_at=item.submitted_at,
            )
            for item in result.items
        ),
        total=result.total,
        limit=result.limit,
        offset=result.offset,
    )


@router.get(
    "/attempts/{attempt_id}",
    response_model=GetAttemptResponse,
    status_code=status.HTTP_200_OK,
)
async def get_attempt(
    attempt_id: UUID,
    user_id: CurrentUserDep,
    query: GetAttemptQueryDep,
) -> GetAttemptResponse:
    result = await query.execute(
        GetAttemptQueryParams(attempt_id=attempt_id, user_id=user_id)
    )
    return GetAttemptResponse(**result.model_dump())


@router.get(
    "/attempts/{attempt_id}/result",
    response_model=GetAttemptResultResponse,
    status_code=status.HTTP_200_OK,
)
async def get_attempt_result(
    attempt_id: UUID,
    user_id: CurrentUserDep,
    query: GetAttemptResultQueryDep,
) -> GetAttemptResultResponse:
    result = await query.execute(
        GetAttemptResultQueryParams(
            attempt_id=attempt_id,
            user_id=user_id,
        )
    )
    return GetAttemptResultResponse(**result.model_dump())


@router.get(
    "/attempts/{attempt_id}/answers",
    response_model=GetAttemptAnswersResponse,
    status_code=status.HTTP_200_OK,
)
async def get_attempt_answers(
    attempt_id: UUID,
    user_id: CurrentUserDep,
    query: GetAttemptAnswersQueryDep,
) -> GetAttemptAnswersResponse:
    result = await query.execute(
        GetAttemptAnswersQueryParams(attempt_id=attempt_id, user_id=user_id)
    )
    return GetAttemptAnswersResponse(
        answers=tuple(
            AttemptAnswerContent(
                exam_session_problem_id=answer.exam_session_problem_id,
                response_data=answer.response_data,
            )
            for answer in result.answers
        )
    )


@router.get(
    "/attempts/{attempt_id}/problems",
    response_model=Page[AttemptProblemContent],
    status_code=status.HTTP_200_OK,
)
async def get_attempt_problems(
    attempt_id: UUID,
    user_id: CurrentUserDep,
    query: GetAttemptProblemsQueryDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[AttemptProblemContent]:
    result = await query.execute(
        GetAttemptProblemsQueryParams(
            attempt_id=attempt_id,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )
    )
    return Page[AttemptProblemContent](
        items=tuple(
            AttemptProblemContent.model_validate(item.model_dump())
            for item in result.items
        ),
        total=result.total,
        limit=result.limit,
        offset=result.offset,
    )


