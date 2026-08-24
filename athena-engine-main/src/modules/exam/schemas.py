from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.modules.exam.database_schemas import ExamConfigSchema
from src.modules.exam.models import ExamSessionStatus, ExamStatus, SessionParticipantStatus
from src.modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPrivatePayloadSchema,
    MCQPublicPayloadSchema,
)

# ---------------- Exam Schemas ----------------

class ExamSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    title: str
    status: ExamStatus
    problem_count: int
    created_by: UUID
    created_at: datetime


class ExamProblemView(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    problem_id: UUID
    order_index: int
    score: Decimal
    negative_score: Decimal
    config: dict[str, Any] = Field(default_factory=dict)

class ExamDetail(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    title: str
    description: str | None
    status: ExamStatus
    config: ExamConfigSchema
    created_by: UUID
    total_score: Decimal
    problems: tuple[ExamProblemView, ...]

# ---------------- ExamSession Schemas ----------------

class ExamSessionSummary(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    exam_id: UUID
    title: str
    description: str | None = None
    status: ExamSessionStatus
    exam_config_snapshot: ExamConfigSchema
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None
    created_by: UUID


class ExamSessionResultContext(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    status: ExamSessionStatus
    end_time: datetime


class SessionParticipantView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    user_id: UUID
    status: SessionParticipantStatus


class ExamSessionProblemDetail(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    exam_problem_id: UUID | None
    public_payload: MCQPublicPayloadSchema
    private_payload: MCQPrivatePayloadSchema
    meta_data: MCQMetaDataSchema
    config: dict[str, Any] = Field(default_factory=dict)
    score: Decimal
    negative_score: Decimal
    order_index: int
    created_at: datetime


class ExamSessionProblemTakeView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    exam_problem_id: UUID | None
    public_payload: MCQPublicPayloadSchema
    config: dict[str, Any] = Field(default_factory=dict)
    score: Decimal
    negative_score: Decimal
    order_index: int

    @field_validator("config", mode="before")
    @classmethod
    def empty_config(cls, value):
        return value or {}


class ExamSessionProblemPublicView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    exam_problem_id: UUID | None
    public_payload: MCQPublicPayloadSchema


class ExamSessionProblemPrivateView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    exam_problem_id: UUID | None
    private_payload: MCQPrivatePayloadSchema


class ExamSessionProblemMetaDataView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    exam_problem_id: UUID | None
    meta_data: MCQMetaDataSchema


class ExamSessionProblemConfigView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    exam_problem_id: UUID | None
    config: dict[str, Any] = Field(default_factory=dict)
    score: Decimal
    negative_score: Decimal
    order_index: int


class ExamSessionProblemGradingData(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    session_id: UUID
    exam_problem_id: UUID | None
    private_payload: MCQPrivatePayloadSchema
    score: Decimal
    negative_score: Decimal
    order_index: int
