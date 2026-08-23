from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

# -------------- Database Schemas --------------

class Option(BaseModel):
    id: int
    label: str | None = None
    content: list[dict[str, Any]] = Field(default_factory=list)


class MCQPublicPayloadSchema(BaseModel):
    type: Literal["MCQ"] = "MCQ"
    content: list[dict[str, Any]] = Field(default_factory=list)
    options: list[Option]


class MCQPrivatePayloadSchema(BaseModel):
    correct_option_id: int


class SinglePDFSourceSchema(BaseModel):
    owner_id: UUID
    asset_id: UUID
    order_index: int | None = None


class MCQMetaDataSchema(BaseModel):
    source: SinglePDFSourceSchema
