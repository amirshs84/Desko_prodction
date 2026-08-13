from datetime import datetime
from enum import StrEnum
from typing import Self
from uuid import UUID

import uuid6
from sqlalchemy import DateTime, Enum as SQLEnum, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from core.exceptions import (
    ProblemNotEditable,
    InvalidStatusTransition,
)
from core.database import Base
from core.type_decorator import PydanticJSONB

from modules.problem.database_schemas import (
    MCQMetaDataSchema,
    MCQPrivatePayloadSchema,
    MCQPublicPayloadSchema,
)


class ProblemStatus(StrEnum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"


_PROBLEM_ALLOWED_TRANSITIONS: dict[ProblemStatus, frozenset[ProblemStatus]] = {
    ProblemStatus.DRAFT: frozenset({ProblemStatus.DRAFT, ProblemStatus.PUBLISHED, ProblemStatus.ARCHIVED}),
    ProblemStatus.PUBLISHED: frozenset({ProblemStatus.DRAFT, ProblemStatus.PUBLISHED, ProblemStatus.ARCHIVED}),
    ProblemStatus.ARCHIVED: frozenset({ProblemStatus.DRAFT, ProblemStatus.ARCHIVED}),
}


class ProblemType(StrEnum):
    MCQ = "MCQ"


class Problem(Base):
    __tablename__ = "problems"

    id: Mapped[UUID] = mapped_column(
        primary_key=True,
        default=uuid6.uuid7,
    )

    status: Mapped[ProblemStatus] = mapped_column(
        SQLEnum(ProblemStatus, native_enum=False, length=20),
        default=ProblemStatus.DRAFT,
        nullable=False,
    )

    type: Mapped[ProblemType] = mapped_column(
        SQLEnum(ProblemType, native_enum=False, length=20),
        default=ProblemType.MCQ,
        nullable=False,
    )

    public_payload: Mapped[MCQPublicPayloadSchema] = mapped_column(
        PydanticJSONB(MCQPublicPayloadSchema),
        nullable=False,
    )

    private_payload: Mapped[MCQPrivatePayloadSchema] = mapped_column(
        PydanticJSONB(MCQPrivatePayloadSchema),
        nullable=False,
    )

    meta_data: Mapped[MCQMetaDataSchema] = mapped_column(
        PydanticJSONB(MCQMetaDataSchema),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("ix_problems_status_created_at", "status", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Problem(id={self.id}, status={self.status})>"

    # ---------- Factory ----------

    @classmethod
    def create(
        cls,
        *,
        id: UUID | None = None,
        public_payload: MCQPublicPayloadSchema,
        private_payload: MCQPrivatePayloadSchema,
        meta_data: MCQMetaDataSchema,
    ) -> Self:
        return cls(
            id=id or uuid6.uuid7(),
            status=ProblemStatus.DRAFT,
            public_payload=public_payload,
            private_payload=private_payload,
            meta_data=meta_data,
        )

    # ---------- Domain Methods ----------

    def publish(self) -> None:
        if self.status == ProblemStatus.PUBLISHED:
            return
        self._ensure_transition_allowed(ProblemStatus.PUBLISHED)

        self.status = ProblemStatus.PUBLISHED

    def draft(self) -> None:
        if self.status == ProblemStatus.DRAFT:
            return
        self._ensure_transition_allowed(ProblemStatus.DRAFT)

        self.status = ProblemStatus.DRAFT

    def archive(self) -> None:
        if self.status == ProblemStatus.ARCHIVED:
            return
        self._ensure_transition_allowed(ProblemStatus.ARCHIVED)

        self.status = ProblemStatus.ARCHIVED

    def replace_public_payload(self, payload: MCQPublicPayloadSchema) -> None:
        self._ensure_editable()
        self.public_payload = payload

    def replace_private_payload(self, payload: MCQPrivatePayloadSchema) -> None:
        self._ensure_editable()
        self.private_payload = payload

    def replace_metadata(self, meta_data: MCQMetaDataSchema) -> None:
        self._ensure_editable()
        self.meta_data = meta_data

    # ---------- Private Helpers ----------

    def _ensure_transition_allowed(self, target: ProblemStatus) -> None:
        if target not in _PROBLEM_ALLOWED_TRANSITIONS.get(self.status, frozenset()):
            raise InvalidStatusTransition()

    def _ensure_editable(self) -> None:
        if self.status != ProblemStatus.DRAFT:
            raise ProblemNotEditable()
