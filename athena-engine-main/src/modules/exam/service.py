from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal, Mapping
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator

from src.core.database import AsyncSqlAlchemyUoW
from src.core.exceptions import ExamNotFound, ExamSessionNotFound

from src.modules.exam.database_schemas import ExamConfigSchema
from src.modules.exam.models import (
    Exam,
    ExamSession,
    ExamSessionProblemSnapshot,
    ExamStatus,
    Scoring,
    TimePeriod,
    ParticipantAddOutcome
)
from src.modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPrivatePayloadSchema,
    MCQPublicPayloadSchema,
    Option,
)
from src.modules.problem.models import Problem, ProblemType


_SINGLE_SOURCE_SCORING = Scoring(
    score=Decimal("3.00"),
    negative_score=Decimal("1.00"),
)


class SingleSourceExamContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    problems_count: int = Field(gt=0)
    options_per_problem: int = Field(gt=0)
    answer_keys: dict[int, int]

    @field_validator("answer_keys", mode="before")
    @classmethod
    def coerce_answer_keys(cls, value: dict) -> dict[int, int]:
        if not isinstance(value, dict):
            return value
        return {int(key): int(answer) for key, answer in value.items()}

    @model_validator(mode="after")
    def validate_answer_keys(self) -> "SingleSourceExamContent":
        if len(self.answer_keys) != self.problems_count:
            raise ValueError()

        invalid_question_numbers = set(self.answer_keys) - set(
            range(1, self.problems_count + 1)
        )
        if invalid_question_numbers:
            raise ValueError()

        if any(
            answer < 1 or answer > self.options_per_problem
            for answer in self.answer_keys.values()
        ):
            raise ValueError()

        return self


class CreateExamCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    title: str
    description: str | None = None
    exam_type: Literal["SINGLE_PDF"] = "SINGLE_PDF"
    config: ExamConfigSchema
    content: SingleSourceExamContent
    created_by: UUID

    @model_validator(mode="after")
    def validate_source(self) -> "CreateExamCommand":
        if self.config.source is None:
            raise ValueError()
        return self


class CreateExamResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID


class CreateExamService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(self, command: CreateExamCommand) -> CreateExamResult:
        source = command.config.source

        async with self._uow as uow:
            exam = Exam.create_draft(
                title=command.title,
                description=command.description,
                config=command.config,
                created_by=command.created_by,
            )
            for question_number in range(
                1,
                command.content.problems_count + 1,
            ):
                problem = Problem.create(
                    type=ProblemType.MCQ,
                    public_payload=MCQPublicPayloadSchema(
                        options=[
                            Option(id=option_id)
                            for option_id in range(
                                1,
                                command.content.options_per_problem + 1,
                            )
                        ],
                    ),
                    private_payload=MCQPrivatePayloadSchema(
                        correct_option_id=command.content.answer_keys[
                            question_number
                        ],
                    ),
                    meta_data=MCQMetaDataSchema(
                        source=source.model_copy(
                            update={"order_index": question_number}
                        ),
                    ),
                    created_by=command.created_by,
                )
                problem.publish()
                uow.problem.add(problem)

                exam.add_problem(
                    problem_id=problem.id,
                    scoring=_SINGLE_SOURCE_SCORING,
                    config={},
                )

            exam.publish()
            uow.exam.add(exam)
            await uow.commit()

        return CreateExamResult(exam_id=exam.id)


class CreateExamSessionCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID
    title: str
    start_time: datetime
    end_time: datetime
    created_by: UUID


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

            if (
                exam.status is not ExamStatus.PUBLISHED
                or exam.created_by != command.created_by
            ):
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
                created_by=command.created_by,
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
    requested_by: UUID


class AddParticipantResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    created: list[UUID]
    reassigned: list[UUID]
    unchanged: list[UUID]

    @classmethod
    def from_outcomes(
        cls,
        outcomes: Mapping[UUID, ParticipantAddOutcome],
    ) -> "AddParticipantResult":
        buckets: dict[ParticipantAddOutcome, list[UUID]] = {
            outcome: [] for outcome in ParticipantAddOutcome
        }
        for user_id, outcome in outcomes.items():
            buckets[outcome].append(user_id)

        return cls(
            created=buckets[ParticipantAddOutcome.CREATED],
            reassigned=buckets[ParticipantAddOutcome.REASSIGNED],
            unchanged=buckets[ParticipantAddOutcome.UNCHANGED],
        )


class AddParticipantService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: AddParticipantCommand,
    ) -> AddParticipantResult:
        async with self._uow as uow:
            session = await uow.exam_session.get_for_update(command.session_id)
            if session.created_by != command.requested_by:
                raise ExamSessionNotFound()

            outcomes = {
                user_id: session.add_participant(user_id)
                for user_id in dict.fromkeys(command.user_ids)
            }

            await uow.commit()

        return AddParticipantResult.from_outcomes(outcomes)


class RemoveParticipantCommand(BaseModel):
    model_config = ConfigDict(frozen=True)
    
    session_id: UUID
    user_id: UUID
    requested_by: UUID


class RemoveParticipantService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: RemoveParticipantCommand,
    ) -> None:
        async with self._uow as uow:
            session = await uow.exam_session.get_for_update(command.session_id)
            if session.created_by != command.requested_by:
                raise ExamSessionNotFound()

            session.remove_participant(command.user_id)

            await uow.commit()


class UpdateExamSessionCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    updated_by: UUID
    title: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None


class UpdateExamSessionService:
    def __init__(self, uow: AsyncSqlAlchemyUoW):
        self._uow = uow

    async def execute(
        self,
        command: UpdateExamSessionCommand,
        now: datetime | None = None,
    ) -> None:
        now = now or datetime.now(UTC)
        async with self._uow as uow:
            session = await uow.exam_session.get_for_update(
                session_id=command.session_id
            )

            if session.created_by != command.updated_by:
                raise ExamSessionNotFound()

            if command.title is not None:
                session.rename(command.title)

            if command.start_time is not None or command.end_time is not None:
                session.change_time_period(
                    TimePeriod(
                        start_time=command.start_time or session.time_period.start_time,
                        end_time=command.end_time or session.time_period.end_time,
                    ),
                    now=now,
                )

            await uow.commit()
