from datetime import UTC, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError

from src.core.database import AsyncSqlAlchemyUoW
from src.core.exceptions import (
    AttemptAlreadySubmitted,
    AttemptExpired,
    ExamSessionProblemNotFound,
    ParticipantIsNotAssigned,
    SessionAttemptNotFound,
    SessionWasCancelled,
)
from src.modules.exam.models import ExamSessionStatus, SessionParticipantStatus, TimePeriod
from src.modules.session.database_schemas import MCQResponseDataSchema
from src.modules.session.models import GradingDomainService, SessionAttempt, SessionAttemptStatus


class StartAttemptCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    user_id: UUID


class StartAttemptResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    started_at: datetime
    expire_at: datetime


class StartAttemptService:
    """
    Starts or resumes a participant's attempt within the session time window.

    An exam session may be active according to its ``start_time`` and
    ``end_time`` while its status has not yet transitioned to ``RUNNING``.
    This can happen because status synchronization is delayed. Attempt
    creation is unaffected because this service relies on the session's time
    window, rather than the ``RUNNING`` status, to determine attempt timing.

    Synchronizing the session status is the responsibility of a background
    worker or a lazy transition performed by the ExamSession service.
    """

    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: StartAttemptCommand,
        now: datetime | None = None
    ) -> StartAttemptResult:
        now = now or datetime.now(UTC)
        async with self._uow as uow:

            session_summary = await uow.exam_session.get_summary(session_id=command.session_id)

            if session_summary.status is ExamSessionStatus.CANCELLED:
                raise SessionWasCancelled()

            existing_attempt = await uow.attempt.find_summary(session_id=command.session_id, user_id=command.user_id)

            if existing_attempt:
                if existing_attempt.status is not SessionAttemptStatus.IN_PROGRESS:
                    raise AttemptAlreadySubmitted()

                if existing_attempt.expire_at < now:
                    attempt = await uow.attempt.get_root_for_update(attempt_id=existing_attempt.id)
                    attempt.submit(now=now)
                    await uow.commit()
                    raise AttemptAlreadySubmitted()

                return StartAttemptResult(
                    attempt_id=existing_attempt.id,
                    started_at=existing_attempt.started_at,
                    expire_at=existing_attempt.expire_at
                )
            
            participant = await uow.exam_session.get_participant(
                session_id=command.session_id,
                user_id=command.user_id
            )

            if participant.status is not SessionParticipantStatus.ASSIGNED:
                raise ParticipantIsNotAssigned()

            time_period = TimePeriod(
                start_time=session_summary.start_time,
                end_time=session_summary.end_time
            )

            attempt = SessionAttempt.create(
                user_id=participant.user_id,
                session_id=participant.session_id,
                participant_id=participant.id,
                time_period=time_period,
                expire_at=time_period.end_time,
                now=now
            )

            try:
                uow.attempt.add(attempt)
                await uow.commit()

                return StartAttemptResult(
                    attempt_id=attempt.id,
                    started_at=attempt.started_at,
                    expire_at=attempt.expire_at
                )
            except IntegrityError:
                await uow.rollback()
                existing_attempt = await uow.attempt.find_summary(session_id=command.session_id, user_id=command.user_id)

                if not existing_attempt:
                    raise

                return StartAttemptResult(
                    attempt_id=existing_attempt.id,
                    started_at=existing_attempt.started_at,
                    expire_at=existing_attempt.expire_at,
                )


class SubmitAttemptCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    attempt_id: UUID


class SubmitAttemptService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow
        self._grading_service = GradingDomainService()

    async def execute(
        self,
        command: SubmitAttemptCommand,
        now: datetime | None = None
    ) -> None:
        now = now or datetime.now(UTC)
        async with self._uow as uow:
            attempt = await uow.attempt.get_root_for_update(attempt_id=command.attempt_id)

            if attempt.user_id != command.user_id:
                raise SessionAttemptNotFound()

            attempt.submit(now=now)

            await uow.commit()

        try:
            async with self._uow as uow:
                attempt = await uow.attempt.get_for_update(attempt_id=command.attempt_id)

                problems_grading_data = await uow.exam_session.get_all_problem_grading_data(attempt.session_id)
                problems_grading_data = {
                    data.id: data for data in problems_grading_data
                }

                self._grading_service.grade_attempt(
                    attempt=attempt,
                    problems_grading_data=problems_grading_data
                )

                await uow.commit()
        except Exception:
            """
            TODO: Log the exception with the attempt ID and include
            the traceback for debugging and monitoring purposes.
            """
            pass


class SendAnswerCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    user_id: UUID
    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema


class SendAnswerResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    expire_at: datetime


class SendAnswerService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: SendAnswerCommand,
        now: datetime | None = None
    ) -> SendAnswerResult:
        now = now or datetime.now(UTC)
        async with self._uow as uow:
            attempt = await uow.attempt.get_for_answer_upsert(
                attempt_id=command.attempt_id,
                user_id=command.user_id,
                exam_session_problem_id=command.exam_session_problem_id
            )

            problem_exists = (
                await uow.exam_session.problem_exists_in_session(
                    session_id=attempt.session_id,
                    problem_id=command.exam_session_problem_id,
                )
            )

            if not problem_exists:
                raise ExamSessionProblemNotFound()

            try:
                attempt.upsert_answer(
                    exam_session_problem_id=command.exam_session_problem_id,
                    response_data=command.response_data,
                    now=now
                )
            except AttemptExpired:
                attempt.submit(now=now)
                await uow.commit()
                raise

            await uow.commit()

            return SendAnswerResult(expire_at=attempt.expire_at)
