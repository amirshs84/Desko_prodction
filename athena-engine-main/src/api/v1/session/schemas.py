from typing import Self
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator, Field

from src.modules.exam.database_schemas import ExamConfigSchema
from src.modules.exam.models import ExamSessionStatus, SessionParticipantStatus
from src.modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPublicPayloadSchema,
)
from src.modules.session.models import SessionAttemptStatus


class CreateExamSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str
    start_time: datetime
    end_time: datetime


class CreateExamSessionResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID


class GetExamSessionResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    exam_id: UUID
    title: str
    description: str | None
    status: ExamSessionStatus
    config: ExamConfigSchema
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None
    created_by: UUID


class ExamSessionListContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    exam_id: UUID
    title: str
    description: str | None
    status: ExamSessionStatus
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None


class MySessionContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    session_id: UUID
    exam_id: UUID
    title: str
    description: str | None
    status: ExamSessionStatus
    config: ExamConfigSchema
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None
    attempt_id: UUID | None
    attempt_status: SessionAttemptStatus | None


class AddParticipantRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_ids: list[UUID]


class AddParticipantResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    created: list[UUID]
    reassigned: list[UUID]
    unchanged: list[UUID]


class ParticipantContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    status: SessionParticipantStatus


class ProblemPreviewContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    type: Literal["MCQ"]
    public_payload: MCQPublicPayloadSchema
    meta_data: MCQMetaDataSchema | None = None
    config: dict[str, Any]
    score: Decimal
    negative_score: Decimal
    order_index: int


class UpdateExamSessionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    start_time: datetime | None = None
    end_time: datetime | None = None

    @model_validator(mode="after")
    def validate_at_least_one_field(self) -> Self:
        if not self.model_fields_set:
            raise ValueError()
        return self
