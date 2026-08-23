from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ProblemNotFound
from src.modules.problem.models import Problem, ProblemStatus
from src.modules.problem.schemas import (
    ProblemDetail,
    ProblemMetadataView,
    ProblemPrivateView,
    ProblemPublicView,
)


class ProblemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ---------- write ----------

    async def get_for_update(self, problem_id: UUID) -> Problem:
        stmt = (
            select(Problem)
            .where(Problem.id == problem_id)
            .with_for_update()
        )

        result = await self.session.execute(stmt)
        problem = result.scalar_one_or_none()

        if problem is None:
            raise ProblemNotFound()

        return problem

    def add(self, problem: Problem) -> None:
        self.session.add(problem)

    async def delete(self, problem: Problem) -> None:
        await self.session.delete(problem)

    # ---------- read ----------

    async def get_detail(self, problem_id: UUID) -> ProblemDetail:
        stmt = select(
            Problem.id,
            Problem.status,
            Problem.type,
            Problem.public_payload,
            Problem.private_payload,
            Problem.meta_data,
            Problem.created_by,
            Problem.created_at,
            Problem.updated_at,
        ).where(Problem.id == problem_id)

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise ProblemNotFound()

        return ProblemDetail.model_validate(row)

    async def get_public(self, problem_id: UUID) -> ProblemPublicView:
        stmt = select(
            Problem.id,
            Problem.status,
            Problem.type,
            Problem.public_payload,
        ).where(Problem.id == problem_id)

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise ProblemNotFound()

        return ProblemPublicView.model_validate(row)

    async def get_private(self, problem_id: UUID) -> ProblemPrivateView:
        stmt = select(
            Problem.id,
            Problem.status,
            Problem.type,
            Problem.private_payload,
        ).where(Problem.id == problem_id)

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise ProblemNotFound()

        return ProblemPrivateView.model_validate(row)

    async def get_metadata(self, problem_id: UUID) -> ProblemMetadataView:
        stmt = select(
            Problem.id,
            Problem.status,
            Problem.type,
            Problem.meta_data,
        ).where(Problem.id == problem_id)

        row = (await self.session.execute(stmt)).one_or_none()
        if row is None:
            raise ProblemNotFound()

        return ProblemMetadataView.model_validate(row)

    async def get_detail_by_many_ids(
        self,
        problem_ids: Sequence[UUID],
    ) -> tuple[ProblemDetail, ...]:
        if not problem_ids:
            return ()

        requested = tuple(dict.fromkeys(problem_ids))

        stmt = select(
            Problem.id,
            Problem.status,
            Problem.type,
            Problem.public_payload,
            Problem.private_payload,
            Problem.meta_data,
            Problem.created_by,
            Problem.created_at,
            Problem.updated_at,
        ).where(Problem.id.in_(requested))

        rows = (await self.session.execute(stmt)).all()
        by_id = {row.id: ProblemDetail.model_validate(row) for row in rows}

        return tuple(
            by_id[problem_id] for problem_id in requested if problem_id in by_id
        )

    async def exists(self, problem_id: UUID) -> bool:
        stmt = select(select(Problem.id).where(Problem.id == problem_id).exists())
        return bool((await self.session.execute(stmt)).scalar_one())

    async def get_status(self, problem_id: UUID) -> ProblemStatus:
        stmt = select(Problem.status).where(Problem.id == problem_id)
        status = (await self.session.execute(stmt)).scalar_one_or_none()
        if status is None:
            raise ProblemNotFound()
        return status
    
