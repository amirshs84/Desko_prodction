from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from src.modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPrivatePayloadSchema,
    MCQPublicPayloadSchema,
)
from src.modules.problem.models import ProblemStatus, ProblemType

# -------------- Repository Schemas --------------

class ProblemDetail(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    status: ProblemStatus
    type: ProblemType
    public_payload: MCQPublicPayloadSchema
    private_payload: MCQPrivatePayloadSchema
    meta_data: MCQMetaDataSchema
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class ProblemPublicView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    status: ProblemStatus
    type: ProblemType
    public_payload: MCQPublicPayloadSchema


class ProblemPrivateView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    status: ProblemStatus
    type: ProblemType
    private_payload: MCQPrivatePayloadSchema


class ProblemMetadataView(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: UUID
    status: ProblemStatus
    type: ProblemType
    meta_data: MCQMetaDataSchema
