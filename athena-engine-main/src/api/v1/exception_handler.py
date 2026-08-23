from dataclasses import dataclass

from fastapi import Request, status
from fastapi.responses import JSONResponse

from src.core.exceptions import (
    DomainError,
    DuplicateExamProblem,
    DuplicateSnapshotOrderIndex,
    EmptyExamCannotBePublished,
    EmptySessionNotAllowed,
    ExamNotEditable,
    ExamNotFound,
    ExamSessionNotFound,
    InvalidExamTitle,
    InvalidScoring,
    InvalidSessionStartTime,
    InvalidSnapshotOrderIndex,
    InvalidStatusTransition,
    InvalidTimePeriod,
    NaiveDatetimeNotAllowed,
    ParticipantsNotModifiable,
    SessionParticipantNotFound,
    SessionWasCancelled,
    AttemptAlreadySubmitted,
    ParticipantIsNotAssigned,
    SessionAttemptNotFound,
    ExamSessionNotComplete,
    ParticipantNotFound,
    SessionNotStartedYet,
    SessionAlreadyExpired,
    InvalidAttemptDeadline,
    ExamSessionProblemNotFound,
    AttemptExpired,
    ProblemNotFound,
    ProblemNotEditable,
    AnswerNotFound,
    AttemptNotInProgress,
    AttemptAlreadyExists,
    DuplicateSessionParticipant,
    InvalidSessionEndTime,
    ExamHasSessions,
    ExamProblemNotFound,
    IncompleteReorder,
    AttemptNotGraded,
    AttemptNotSubmitted,
    InvalidAttemptScore,
    InvalidAnswerScore,
    IncompleteGrading,
    MissingProblemGradingDataError,
)


@dataclass(frozen=True)
class ErrorResponse:
    status_code: int
    code: str


_ERROR_MAP: dict[type[DomainError], ErrorResponse] = {
    ExamNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="exam_not_found",
    ),
    ExamSessionNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="exam_session_not_found",
    ),
    InvalidExamTitle: ErrorResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="invalid_exam_title",
    ),
    ExamNotEditable: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="exam_not_editable",
    ),
    DuplicateExamProblem: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="duplicate_exam_problem",
    ),
    InvalidStatusTransition: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="invalid_status_transition",
    ),
    EmptyExamCannotBePublished: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="empty_exam_cannot_be_published",
    ),
    NaiveDatetimeNotAllowed: ErrorResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="naive_datetime_not_allowed",
    ),
    InvalidTimePeriod: ErrorResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="invalid_time_period",
    ),
    InvalidSessionStartTime: ErrorResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="invalid_session_start_time",
    ),
    InvalidScoring: ErrorResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="invalid_scoring",
    ),
    InvalidSnapshotOrderIndex: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="invalid_snapshot_order_index",
    ),
    EmptySessionNotAllowed: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="empty_session_not_allowed",
    ),
    DuplicateSnapshotOrderIndex: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="duplicate_snapshot_order_index",
    ),
    ParticipantsNotModifiable: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="participant_not_modifiable",
    ),
    SessionParticipantNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="session_participant_not_found",
    ),
    SessionWasCancelled: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="session_was_cancelled",
    ),
    AttemptAlreadySubmitted: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="attempt_already_submitted",
    ),
    ParticipantIsNotAssigned: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="participant_is_not_assigned",
    ),
    SessionAttemptNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="session_attempt_not_found",
    ),
    ExamSessionNotComplete: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="exam_session_not_complete",
    ),
    ParticipantNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="participant_not_found",
    ),
    SessionNotStartedYet: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="session_not_started_yet",
    ),
    SessionAlreadyExpired: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="session_already_expired",
    ),
    InvalidAttemptDeadline: ErrorResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="invalid_attempt_deadline",
    ),
    ExamSessionProblemNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="exam_session_problem_not_found",
    ),
    AttemptExpired: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="attempt_expired",
    ),
    ProblemNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="problem_not_found",
    ),
    ProblemNotEditable: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="problem_not_editable",
    ),
    ExamProblemNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="exam_problem_not_found",
    ),
    ExamHasSessions: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="exam_has_sessions",
    ),
    InvalidSessionEndTime: ErrorResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="invalid_session_end_time",
    ),
    DuplicateSessionParticipant: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="duplicate_session_participant",
    ),
    AttemptAlreadyExists: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="attempt_already_exists",
    ),
    AttemptNotInProgress: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="attempt_not_in_progress",
    ),
    AnswerNotFound: ErrorResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        code="answer_not_found",
    ),
    IncompleteReorder: ErrorResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="incomplete_reorder",
    ),
    AttemptNotGraded: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="attempt_not_graded",
    ),
    AttemptNotSubmitted: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="attempt_not_submitted",
    ),
    InvalidAttemptScore: ErrorResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="invalid_attempt_score",
    ),
    InvalidAnswerScore: ErrorResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="invalid_answer_score",
    ),
    IncompleteGrading: ErrorResponse(
        status_code=status.HTTP_409_CONFLICT,
        code="incomplete_grading",
    ),
    MissingProblemGradingDataError: ErrorResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        code="missing_problem_grading_data",
    ),
}


async def domain_error_handler(
    request: Request,
    exc: DomainError,
) -> JSONResponse:
    error_config = _ERROR_MAP.get(type(exc))

    if not error_config:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "code": "internal_server_error",
            },
        )

    return JSONResponse(
        status_code=error_config.status_code,
        content={
            "code": error_config.code,
        },
    )
