from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from src.modules.problem.database_schemas import MCQPublicPayloadSchema
from src.modules.session.database_schemas import MCQResponseDataSchema


class StartAttemptResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    started_at: datetime
    expire_at: datetime


class SendAnswerRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema


class SendAnswerResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    expire_at: datetime


class GetAttemptResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    session_id: UUID
    status: str
    started_at: datetime
    expire_at: datetime
    submitted_at: datetime | None


class AttemptAnswerContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema


class GetAttemptAnswersResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    answers: tuple[AttemptAnswerContent, ...]


class AttemptResultAnswerContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    exam_session_problem_id: UUID
    response_data: MCQResponseDataSchema
    correct_option_id: int
    score: Decimal


class GetAttemptResultResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    user_id: UUID
    attempt_id: UUID
    min_score: Decimal
    max_score: Decimal
    score: Decimal
    answers: tuple[AttemptResultAnswerContent, ...]


class AttemptProblemContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: UUID
    type: Literal["MCQ"]
    public_payload: MCQPublicPayloadSchema
    config: dict[str, Any]
    score: Decimal
    negative_score: Decimal
    order_index: int


class SessionAttemptListContent(BaseModel):
    model_config = ConfigDict(frozen=True)

    attempt_id: UUID
    user_id: UUID
    status: str
    score: Decimal | None
    min_score: Decimal | None
    max_score: Decimal | None
    started_at: datetime
    expire_at: datetime
    submitted_at: datetime | None
