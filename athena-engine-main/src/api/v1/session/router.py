from uuid import UUID
from typing import Annotated

from fastapi import APIRouter, status, Query

from src.core.schemas import Page
from src.api.v1.session.dependencies import (
    CreateExamSessionServiceDep,
    GetExamSessionQueryDep,
    AddParticipantServiceDep,
    RemoveParticipantServiceDep,
    GetSessionParticipantsQueryDep,
    GetSessionProblemsQueryDep,
    UpdateExamSessionServiceDep,
    ListMySessionsQueryDep,
)
from src.api.v1.session.schemas import (
    CreateExamSessionRequest,
    CreateExamSessionResponse,
    GetExamSessionResponse,
    AddParticipantRequest,
    AddParticipantResponse,
    ParticipantContent,
    ProblemPreviewContent,
    UpdateExamSessionRequest,
    MySessionContent,
)
from src.core.security import CurrentUserDep
from src.modules.exam.query import (
    GetExamSessionQueryParams,
    GetSessionParticipantsQueryParams,
    GetSessionProblemsQueryParams,
    ListMySessionsQueryParams,
)
from src.modules.exam.service import CreateExamSessionCommand, AddParticipantCommand, RemoveParticipantCommand, UpdateExamSessionCommand


router = APIRouter(tags=["ExamSessions"])


@router.post(
    "/exams/{exam_id}/sessions",
    response_model=CreateExamSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_exam_session(
    exam_id: UUID,
    request: CreateExamSessionRequest,
    service: CreateExamSessionServiceDep,
    current_user: CurrentUserDep,
) -> CreateExamSessionResponse:
    result = await service.execute(
        CreateExamSessionCommand(
            exam_id=exam_id,
            **request.model_dump(),
            created_by=current_user,
        )
    )
    return CreateExamSessionResponse(session_id=result.exam_session_id)


@router.get(
    "/me/sessions",
    response_model=Page[MySessionContent],
    status_code=status.HTTP_200_OK,
)
async def list_my_sessions(
    current_user: CurrentUserDep,
    query: ListMySessionsQueryDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[MySessionContent]:
    result = await query.execute(
        ListMySessionsQueryParams(
            user_id=current_user,
            limit=limit,
            offset=offset,
        )
    )
    return Page[MySessionContent](
        items=tuple(MySessionContent.model_validate(item) for item in result.items),
        total=result.total,
        limit=result.limit,
        offset=result.offset,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=GetExamSessionResponse,
    status_code=status.HTTP_200_OK,
)
async def get_exam_session(
    session_id: UUID,
    query: GetExamSessionQueryDep,
    current_user: CurrentUserDep,
) -> GetExamSessionResponse:
    result = await query.execute(
        GetExamSessionQueryParams(
            session_id=session_id,
            requested_by=current_user,
        )
    )
    return GetExamSessionResponse(**result.model_dump())


@router.post(
    "/sessions/{session_id}/participants",
    response_model=AddParticipantResponse,
    status_code=status.HTTP_200_OK,
)
async def add_participant(
    session_id: UUID,
    request: AddParticipantRequest,
    service: AddParticipantServiceDep,
    current_user: CurrentUserDep,
) -> AddParticipantResponse:
    result = await service.execute(
        AddParticipantCommand(
            session_id=session_id,
            user_ids=request.user_ids,
            requested_by=current_user,
        )
    )
    return AddParticipantResponse(**result.model_dump())


@router.delete(
    "/sessions/{session_id}/participants/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_participant(
    session_id: UUID,
    user_id: UUID,
    service: RemoveParticipantServiceDep,
    current_user: CurrentUserDep,
) -> None:
    await service.execute(
        RemoveParticipantCommand(
            session_id=session_id,
            user_id=user_id,
            requested_by=current_user,
        )
    )


@router.get(
    "/sessions/{session_id}/participants",
    response_model=Page[ParticipantContent],
    status_code=status.HTTP_200_OK,
)
async def get_session_participants(
    session_id: UUID,
    query: GetSessionParticipantsQueryDep,
    current_user: CurrentUserDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ParticipantContent]:
    result = await query.execute(
        GetSessionParticipantsQueryParams(
            session_id=session_id,
            requested_by=current_user,
            limit=limit,
            offset=offset,
        )
    )
    return result


@router.get(
    "/sessions/{session_id}/problems",
    response_model=Page[ProblemPreviewContent],
    status_code=status.HTTP_200_OK,
)
async def get_session_problems(
    session_id: UUID,
    query: GetSessionProblemsQueryDep,
    current_user: CurrentUserDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ProblemPreviewContent]:
    result = await query.execute(
        GetSessionProblemsQueryParams(
            session_id=session_id,
            requested_by=current_user,
            limit=limit,
            offset=offset,
        )
    )
    return Page[ProblemPreviewContent](
        items=tuple(ProblemPreviewContent.model_validate(item) for item in result.items),
        total=result.total,
        limit=result.limit,
        offset=result.offset,
    )


@router.patch(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def update_session(
    session_id: UUID,
    user_id: CurrentUserDep,
    service: UpdateExamSessionServiceDep,
    request: UpdateExamSessionRequest,
) -> None:
    await service.execute(
        UpdateExamSessionCommand(
            session_id=session_id,
            updated_by=user_id,
            title=request.title,
            start_time=request.start_time,
            end_time=request.end_time,
        )
    )
