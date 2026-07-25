"""نگاشت دوطرفه بین موجودیت‌های دامنه‌ی مداخله و مدل‌های Django."""
from __future__ import annotations

from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ...domain.entities.plan_run import PlanProposal, PlanRun
from ...domain.entities.student_group import StudentGroup
from ...domain.enums import IntensityLevel, PlanMode, ProposalStatus
from ...domain.value_objects.plan_window import PlanWindow
from ...domain.value_objects.planned_block import PlannedBlock
from . import models as m


class StudentGroupMapper:
    @staticmethod
    def to_entity(row: m.StudentGroupModel, member_ids: set[int]) -> StudentGroup:
        return StudentGroup(
            id=row.id,
            school_id=row.school_id,
            consultant_id=row.consultant_id,
            name=row.name,
            description=row.description,
            member_ids=member_ids,
            created_at=row.created_at,
        )

    @staticmethod
    def to_model(entity: StudentGroup) -> m.StudentGroupModel:
        return m.StudentGroupModel(
            id=entity.id,
            school_id=entity.school_id,
            consultant_id=entity.consultant_id,
            name=entity.name,
            description=entity.description,
        )


class PlannedBlockMapper:
    """قالب JSON بلوک‌های پیشنهادی داخل ``PlanProposal.blocks``."""

    @staticmethod
    def dump(block: PlannedBlock) -> dict:
        return {
            'jy': block.date.jy,
            'jm': block.date.jm,
            'jd': block.date.jd,
            'start_minutes': block.slot.start_minutes,
            'end_minutes': block.slot.end_minutes,
            'subject': block.subject,
        }

    @staticmethod
    def load(data: dict) -> PlannedBlock:
        return PlannedBlock(
            date=JalaliDate(data['jy'], data['jm'], data['jd']),
            slot=TimeRange(data['start_minutes'], data['end_minutes']),
            subject=data['subject'],
        )


class PlanProposalMapper:
    @staticmethod
    def to_entity(row: m.PlanProposalModel) -> PlanProposal:
        return PlanProposal(
            id=row.id,
            plan_run_id=row.plan_run_id,
            student_id=row.student_id,
            group_tag=row.group_tag,
            blocks=tuple(PlannedBlockMapper.load(item) for item in row.blocks),
            status=ProposalStatus(row.status),
            shortfall_minutes=row.shortfall_minutes,
            applied_blocks=row.applied_blocks,
            responded_at=row.responded_at,
            created_at=row.created_at,
        )


class PlanRunMapper:
    @staticmethod
    def to_entity(row: m.PlanRunModel, proposals: tuple[PlanProposal, ...] = ()) -> PlanRun:
        return PlanRun(
            id=row.id,
            consultant_id=row.consultant_id,
            school_id=row.school_id,
            group_id=row.group_id,
            mode=PlanMode(row.mode),
            intensity=IntensityLevel(row.intensity),
            group_tag=row.group_tag,
            window=PlanWindow(
                start=JalaliDate(row.start_jy, row.start_jm, row.start_jd),
                end=JalaliDate(row.end_jy, row.end_jm, row.end_jd),
            ),
            summary=row.summary,
            proposals=proposals,
            created_at=row.created_at,
        )

    @staticmethod
    def to_model(entity: PlanRun) -> m.PlanRunModel:
        return m.PlanRunModel(
            consultant_id=entity.consultant_id,
            school_id=entity.school_id,
            group_id=entity.group_id,
            mode=entity.mode.value,
            intensity=entity.intensity.value,
            group_tag=entity.group_tag,
            start_date=entity.window.start.to_gregorian(),
            end_date=entity.window.end.to_gregorian(),
            start_jy=entity.window.start.jy,
            start_jm=entity.window.start.jm,
            start_jd=entity.window.start.jd,
            end_jy=entity.window.end.jy,
            end_jm=entity.window.end.jm,
            end_jd=entity.window.end.jd,
            summary=entity.summary,
        )
