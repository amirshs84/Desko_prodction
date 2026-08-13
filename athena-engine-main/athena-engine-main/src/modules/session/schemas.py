from decimal import Decimal
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from modules.session.models import SessionAttemptStatus
from modules.session.database_schemas import MCQResponseDataSchema


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
