from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator, field_validator

from src.modules.exam.database_schemas import RenderMode
from src.modules.exam.models import ExamStatus


class CreateExamSource(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    owner_id: UUID
    asset_id: UUID


class CreateExamConfig(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    render_mode: RenderMode = RenderMode.SINGLE_PDF
    source: CreateExamSource


class CreateExamContent(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

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
    def validate_answer_keys(self) -> "CreateExamContent":
        expected_question_numbers = set(range(1, self.problems_count + 1))
        if set(self.answer_keys) != expected_question_numbers:
            raise ValueError()

        if any(
            answer < 1 or answer > self.options_per_problem
            for answer in self.answer_keys.values()
        ):
            raise ValueError()

        return self


class CreateExamRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str
    description: str | None = None
    exam_type: Literal["SINGLE_PDF"] = "SINGLE_PDF"
    config: CreateExamConfig
    content: CreateExamContent


class CreateExamResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID


class ExamSummaryContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID
    title: str
    status: ExamStatus
    problem_count: int
    created_at: str


class GetExamResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_id: UUID
    title: str
    description: str | None
    status: ExamStatus
    problem_count: int
    total_score: str
    config: dict
