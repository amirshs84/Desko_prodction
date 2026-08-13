from uuid import UUID
from datetime import datetime, UTC

from pydantic import BaseModel, ConfigDict

from core.database import AsyncSqlAlchemyUoW
from core.exceptions import ExamNotFound

from modules.exam.models import ExamStatus, ExamSessionProblemSnapshot, Scoring, ExamSession, TimePeriod

class CreateExamSessionCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID
    title: str
    start_time: datetime
    end_time: datetime


class CreateExamSessionResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_session_id: UUID


class CreateExamSessionService:
    """TODO:
    Update `get_detail_by_many_ids` to raise an error when any requested problem is
    missing or when duplicate problem IDs are provided. This keeps these validation
    rules out of the service layer and enforces unique `ExamProblem` entries per
    exam. Also validate each problem's status before creating the snapshots.
    """

    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: CreateExamSessionCommand,
        now: datetime | None = None
    ) -> CreateExamSessionResult:
        now = now or datetime.now(UTC)
        async with self._uow as uow:
            exam = await uow.exam.get_detail(exam_id=command.exam_id)

            if exam.status is not ExamStatus.PUBLISHED:
                raise ExamNotFound()

            problem_ids = [ep.problem_id for ep in exam.problems]
            problems = await uow.problem.get_detail_by_many_ids(problem_ids=problem_ids)
            problem_by_id = {problem.id: problem for problem in problems}

            snapshots: tuple[ExamSessionProblemSnapshot, ...] = tuple(
                ExamSessionProblemSnapshot(
                    type=problem_by_id[exam_problem.problem_id].type,
                    public_payload=problem_by_id[exam_problem.problem_id].public_payload,
                    private_payload=problem_by_id[exam_problem.problem_id].private_payload,
                    meta_data=problem_by_id[exam_problem.problem_id].meta_data,
                    config=exam_problem.config,
                    scoring=Scoring(
                        score=exam_problem.score,
                        negative_score=exam_problem.negative_score
                    ),
                    order_index=exam_problem.order_index,
                    exam_problem_id=exam_problem.id,
                )
                for exam_problem in exam.problems
            )

            exam_session = ExamSession.create(
                exam_id=command.exam_id,
                title=command.title,
                exam_config_snapshot=exam.config,
                time_period=TimePeriod(
                    start_time=command.start_time,
                    end_time=command.end_time
                ),
                problem_snapshots=snapshots,
                now=now
            )

            uow.exam_session.add(exam_session)
            await uow.commit()

            return CreateExamSessionResult(exam_session_id=exam_session.id)


class AddParticipantCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    user_ids: list[UUID]


class AddParticipantService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: AddParticipantCommand,
    ) -> None:
        async with self._uow as uow:
            session = await uow.exam_session.get_for_update(command.session_id)

            for user_id in dict.fromkeys(command.user_ids):
                session.add_participant(user_id)

            await uow.commit()


class RemoveParticipantCommand(BaseModel):
    model_config = ConfigDict
    
    session_id: UUID
    user_ids: list[UUID]


class RemoveParticipantService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: RemoveParticipantCommand,
    ) -> None:
        async with self._uow as uow:
            session = await uow.exam_session.get_for_update(command.session_id)

            for user_id in dict.fromkeys(command.user_ids):
                session.remove_participant(user_id)

            await uow.commit()