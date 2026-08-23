from typing import Annotated

from fastapi import Depends

from src.core.database import UoWDep
from src.modules.session.query import (
    GetAttemptAnswersQuery,
    GetAttemptProblemsQuery,
    GetAttemptQuery,
    GetAttemptResultQuery,
    ListSessionAttemptsQuery,
)
from src.modules.session.service import StartAttemptService, SendAnswerService, SubmitAttemptService


def start_attempt_service(
    uow: UoWDep,
) -> StartAttemptService:
    return StartAttemptService(uow=uow)


StartAttemptServiceDep = Annotated[
    StartAttemptService,
    Depends(start_attempt_service),
]


def send_answer_service(
    uow: UoWDep,
) -> SendAnswerService:
    return SendAnswerService(uow=uow)


SendAnswerServiceDep = Annotated[
    SendAnswerService,
    Depends(send_answer_service),
]


def submit_attempt_service(
    uow: UoWDep,
) -> SubmitAttemptService:
    return SubmitAttemptService(uow=uow)


SubmitAttemptServiceDep = Annotated[
    SubmitAttemptService,
    Depends(submit_attempt_service),
]


def get_attempt_query(
    uow: UoWDep,
) -> GetAttemptQuery:
    return GetAttemptQuery(uow=uow)


GetAttemptQueryDep = Annotated[
    GetAttemptQuery,
    Depends(get_attempt_query),
]


def get_attempt_result_query(
    uow: UoWDep,
) -> GetAttemptResultQuery:
    return GetAttemptResultQuery(uow=uow)


GetAttemptResultQueryDep = Annotated[
    GetAttemptResultQuery,
    Depends(get_attempt_result_query),
]


def get_attempt_answers_query(
    uow: UoWDep,
) -> GetAttemptAnswersQuery:
    return GetAttemptAnswersQuery(uow=uow)


GetAttemptAnswersQueryDep = Annotated[
    GetAttemptAnswersQuery,
    Depends(get_attempt_answers_query),
]


def get_attempt_problems_query(
    uow: UoWDep,
) -> GetAttemptProblemsQuery:
    return GetAttemptProblemsQuery(uow=uow)


GetAttemptProblemsQueryDep = Annotated[
    GetAttemptProblemsQuery,
    Depends(get_attempt_problems_query),
]


def list_session_attempts_query(uow: UoWDep) -> ListSessionAttemptsQuery:
    return ListSessionAttemptsQuery(uow=uow)


ListSessionAttemptsQueryDep = Annotated[
    ListSessionAttemptsQuery,
    Depends(list_session_attempts_query),
]
