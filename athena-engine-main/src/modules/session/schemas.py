from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.modules.session.database_schemas import MCQResponseDataSchema
from src.modules.session.models import SessionAttemptStatus


class SessionAttemptSummary(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    user_id: UUID
    session_id: UUID
    participant_id: UUID
    status: SessionAttemptStatus
    started_at: datetime
    expire_at: datetime
    submitted_at: datetime | None


class AnswerView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema
    score: Decimal | None
    created_at: datetime


class SessionAttemptDetail(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    user_id: UUID
    session_id: UUID
    participant_id: UUID
    status: SessionAttemptStatus
    score: Decimal | None
    started_at: datetime
    expire_at: datetime
    submitted_at: datetime | None
    answers: tuple[AnswerView, ...]


class SessionAttemptListItem(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    user_id: UUID
    session_id: UUID
    status: SessionAttemptStatus
    score: Decimal | None
    min_score: Decimal | None
    max_score: Decimal | None
    started_at: datetime
    expire_at: datetime
    submitted_at: datetime | None


class SessionAttemptResultSummary(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    user_id: UUID
    session_id: UUID
    status: SessionAttemptStatus
    score: Decimal | None
    min_score: Decimal | None
    max_score: Decimal | None
    submitted_at: datetime | None


class AttemptResultAnswerView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema
    correct_option_id: int
    score: Decimal


class SessionAttemptResult(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    user_id: UUID
    status: SessionAttemptStatus
    score: Decimal
    min_score: Decimal
    max_score: Decimal
    answers: tuple[AttemptResultAnswerView, ...]
