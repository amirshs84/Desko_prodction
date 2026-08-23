from typing import Annotated

from fastapi import Depends

from src.core.database import UoWDep
from src.modules.exam.query import (
    GetExamQuery,
    GetExamSessionQuery,
    GetSessionParticipantsQuery,
    GetSessionProblemsQuery,
    ListExamSessionsQuery,
    ListExamsQuery,
    ListMySessionsQuery,
)
from src.modules.exam.service import CreateExamSessionService, AddParticipantService, RemoveParticipantService, UpdateExamSessionService


def get_create_exam_session_service(
    uow: UoWDep,
) -> CreateExamSessionService:
    return CreateExamSessionService(uow=uow)


CreateExamSessionServiceDep = Annotated[
    CreateExamSessionService,
    Depends(get_create_exam_session_service),
]


def get_exam_session_query(
    uow: UoWDep,
) -> GetExamSessionQuery:
    return GetExamSessionQuery(uow=uow)


GetExamSessionQueryDep = Annotated[
    GetExamSessionQuery,
    Depends(get_exam_session_query),
]


def add_participant_service(
    uow: UoWDep,
) -> AddParticipantService:
    return AddParticipantService(uow=uow)


AddParticipantServiceDep = Annotated[
    AddParticipantService,
    Depends(add_participant_service),
]


def remove_participant_service(
    uow: UoWDep,
) -> RemoveParticipantService:
    return RemoveParticipantService(uow=uow)


RemoveParticipantServiceDep = Annotated[
    RemoveParticipantService,
    Depends(remove_participant_service),
]


def get_session_participants_query(
    uow: UoWDep,
) -> GetSessionParticipantsQuery:
    return GetSessionParticipantsQuery(uow=uow)


GetSessionParticipantsQueryDep = Annotated[
    GetSessionParticipantsQuery,
    Depends(get_session_participants_query),
]


def get_session_problems_query(
    uow: UoWDep,
) -> GetSessionProblemsQuery:
    return GetSessionProblemsQuery(uow=uow)


GetSessionProblemsQueryDep = Annotated[
    GetSessionProblemsQuery,
    Depends(get_session_problems_query),
]


def update_exam_session_service(
    uow: UoWDep,
) -> UpdateExamSessionService:
    return UpdateExamSessionService(uow=uow)


UpdateExamSessionServiceDep = Annotated[
    UpdateExamSessionService,
    Depends(update_exam_session_service),
]


def list_exams_query(uow: UoWDep) -> ListExamsQuery:
    return ListExamsQuery(uow=uow)


ListExamsQueryDep = Annotated[ListExamsQuery, Depends(list_exams_query)]


def get_exam_query(uow: UoWDep) -> GetExamQuery:
    return GetExamQuery(uow=uow)


GetExamQueryDep = Annotated[GetExamQuery, Depends(get_exam_query)]


def list_exam_sessions_query(uow: UoWDep) -> ListExamSessionsQuery:
    return ListExamSessionsQuery(uow=uow)


ListExamSessionsQueryDep = Annotated[
    ListExamSessionsQuery,
    Depends(list_exam_sessions_query),
]


def list_my_sessions_query(uow: UoWDep) -> ListMySessionsQuery:
    return ListMySessionsQuery(uow=uow)


ListMySessionsQueryDep = Annotated[
    ListMySessionsQuery,
    Depends(list_my_sessions_query),
]
