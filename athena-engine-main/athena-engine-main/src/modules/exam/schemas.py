from decimal import Decimal
from typing import Any
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from modules.exam.models import ExamStatus, ExamSessionStatus, SessionParticipantStatus
from modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPrivatePayloadSchema,
    MCQPublicPayloadSchema,
)
from modules.exam.database_schemas import ExamConfigSchema

# ---------------- Core Schemas ----------------

class Page[T](BaseModel):
    model_config = ConfigDict(frozen=True)

    items: tuple[T, ...]
    total: int
    limit: int
    offset: int

# ---------------- Exam Schemas ----------------

class ExamSummary(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    title: str
    status: ExamStatus
    problem_count: int
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
    total_score: Decimal
    problems: tuple[ExamProblemView, ...]

# ---------------- ExamSession Schemas ----------------

class ExamSessionSummary(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    exam_id: UUID
    title: str
    status: ExamSessionStatus
    exam_config_snapshot: ExamConfigSchema
    start_time: datetime
    end_time: datetime
    cancelled_at: datetime | None


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