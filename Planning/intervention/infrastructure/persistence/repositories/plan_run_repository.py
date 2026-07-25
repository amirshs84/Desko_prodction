"""پیاده‌سازی مخزن اجراهای برنامه‌ریزی و پیشنهادها روی Django ORM."""
from __future__ import annotations

from django.db.models import Prefetch
from django.utils import timezone

from .....shared.domain.errors import ConflictError, NotFoundError
from ....domain.entities.plan_run import PlanProposal, PlanRun
from ....domain.enums import ProposalStatus
from ....domain.repositories.plan_run_repository import (
    PlanProposalRepository,
    PlanRunRepository,
)
from .. import models as m
from ..mappers import PlanProposalMapper, PlannedBlockMapper, PlanRunMapper


class DjangoPlanRunRepository(PlanRunRepository):
    def add(self, run: PlanRun) -> PlanRun:
        row = PlanRunMapper.to_model(run)
        row.save()
        m.PlanProposalModel.objects.bulk_create([
            m.PlanProposalModel(
                plan_run_id=row.id,
                student_id=proposal.student_id,
                group_tag=run.group_tag,
                status=proposal.status.value,
                blocks=[PlannedBlockMapper.dump(block) for block in proposal.blocks],
                shortfall_minutes=proposal.shortfall_minutes,
                applied_blocks=proposal.applied_blocks,
                responded_at=(
                    timezone.now() if proposal.status is not ProposalStatus.PENDING else None
                ),
            )
            for proposal in run.proposals
        ])
        return self._load(row)

    def get(self, run_id: int, *, consultant_id: int) -> PlanRun:
        row = self._base_queryset().filter(id=run_id, consultant_id=consultant_id).first()
        if row is None:
            raise NotFoundError('اجرای برنامه یافت نشد.', meta={'plan_run_id': run_id})
        return self._to_entity(row)

    def list_for_consultant(self, consultant_id: int, *, limit: int = 50) -> list[PlanRun]:
        rows = self._base_queryset().filter(consultant_id=consultant_id)[:limit]
        return [self._to_entity(row) for row in rows]

    # ---------- کمکی‌ها ----------

    @staticmethod
    def _base_queryset():
        return m.PlanRunModel.objects.prefetch_related(
            Prefetch('proposals', queryset=m.PlanProposalModel.objects.order_by('id'))
        )

    def _load(self, row: m.PlanRunModel) -> PlanRun:
        return self._to_entity(self._base_queryset().get(id=row.id))

    @staticmethod
    def _to_entity(row: m.PlanRunModel) -> PlanRun:
        proposals = tuple(
            PlanProposalMapper.to_entity(item) for item in row.proposals.all()
        )
        return PlanRunMapper.to_entity(row, proposals)


class DjangoPlanProposalRepository(PlanProposalRepository):
    def get_for_student(self, proposal_id: int, *, student_id: int) -> PlanProposal:
        row = m.PlanProposalModel.objects.filter(
            id=proposal_id, student_id=student_id,
        ).first()
        if row is None:
            raise NotFoundError('پیشنهاد مورد نظر یافت نشد.', meta={'proposal_id': proposal_id})
        return PlanProposalMapper.to_entity(row)

    def list_for_student(
        self, student_id: int, *, pending_only: bool = False,
    ) -> list[PlanProposal]:
        queryset = m.PlanProposalModel.objects.filter(student_id=student_id)
        if pending_only:
            queryset = queryset.filter(status=ProposalStatus.PENDING.value)
        return [PlanProposalMapper.to_entity(row) for row in queryset]

    def save(self, proposal: PlanProposal) -> None:
        """ذخیره‌ی پاسخ فقط اگر پیشنهاد هنوز در انتظار باشد.

        شرط ``status='pending'`` داخل خود ``UPDATE`` است تا دو کلیک همزمانِ
        دانش‌آموز، برنامه را دو بار روی تقویم ننشاند.
        """
        updated = m.PlanProposalModel.objects.filter(
            id=proposal.id, student_id=proposal.student_id,
            status=ProposalStatus.PENDING.value,
        ).update(
            status=proposal.status.value,
            applied_blocks=proposal.applied_blocks,
            responded_at=timezone.now(),
        )
        if updated == 0:
            raise ConflictError('به این پیشنهاد قبلاً پاسخ داده شده است.')
