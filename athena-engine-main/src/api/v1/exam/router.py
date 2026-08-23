from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, status

from src.api.v1.exam.dependencies import CreateExamServiceDep
from src.api.v1.session.dependencies import GetExamQueryDep, ListExamSessionsQueryDep, ListExamsQueryDep
from src.core.security import CurrentUserDep
from src.core.schemas import Page
from src.api.v1.exam.schemas import CreateExamRequest, CreateExamResponse, GetExamResponse
from src.api.v1.session.schemas import ExamSessionListContent
from src.modules.exam.query import GetExamQueryParams, ListExamSessionsQueryParams, ListExamsQueryParams
from src.modules.exam.service import CreateExamCommand
from src.modules.exam.schemas import ExamSummary


router = APIRouter(tags=["Exams"])


@router.post(
    "/exams",
    response_model=CreateExamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_exam(
    request: CreateExamRequest,
    service: CreateExamServiceDep,
    current_user: CurrentUserDep,
) -> CreateExamResponse:
    result = await service.execute(
        CreateExamCommand(
            **request.model_dump(),
            created_by=current_user,
        )
    )
    return CreateExamResponse(exam_id=result.exam_id)


@router.get(
    "/exams",
    response_model=Page[ExamSummary],
    status_code=status.HTTP_200_OK,
)
async def list_exams(
    current_user: CurrentUserDep,
    query: ListExamsQueryDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ExamSummary]:
    return await query.execute(
        ListExamsQueryParams(
            created_by=current_user,
            limit=limit,
            offset=offset,
        )
    )


@router.get(
    "/exams/{exam_id}",
    response_model=GetExamResponse,
    status_code=status.HTTP_200_OK,
)
async def get_exam(
    exam_id: UUID,
    current_user: CurrentUserDep,
    query: GetExamQueryDep,
) -> GetExamResponse:
    result = await query.execute(
        GetExamQueryParams(
            exam_id=exam_id,
            created_by=current_user,
        )
    )
    return GetExamResponse(
        exam_id=result.id,
        title=result.title,
        description=result.description,
        status=result.status,
        problem_count=len(result.problems),
        total_score=str(result.total_score),
        config=result.config.model_dump(mode="json"),
    )


@router.get(
    "/exams/{exam_id}/sessions",
    response_model=Page[ExamSessionListContent],
    status_code=status.HTTP_200_OK,
)
async def list_exam_sessions(
    exam_id: UUID,
    current_user: CurrentUserDep,
    query: ListExamSessionsQueryDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page[ExamSessionListContent]:
    result = await query.execute(
        ListExamSessionsQueryParams(
            exam_id=exam_id,
            created_by=current_user,
            limit=limit,
            offset=offset,
        )
    )
    return Page[ExamSessionListContent](
        items=tuple(
            ExamSessionListContent(
                session_id=item.session_id,
                exam_id=item.exam_id,
                title=item.title,
                description=item.description,
                status=item.status,
                start_time=item.start_time,
                end_time=item.end_time,
                cancelled_at=item.cancelled_at,
            )
            for item in result.items
        ),
        total=result.total,
        limit=result.limit,
        offset=result.offset,
    )
