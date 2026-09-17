"""نگاشت دوطرفه بین موجودیت‌های دامنه‌ی مداخله و مدل‌های Django."""
from __future__ import annotations

from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ...domain.entities.consultant_note import ConsultantNote
from ...domain.entities.direct_message import DirectMessage, MessageSender
from ...domain.entities.plan_run import PlanProposal, PlanRun
from ...domain.entities.student_group import StudentGroup
from ...domain.enums import (
    ActivityKind,
    DEFAULT_MOVABILITY,
    DEFAULT_PRIORITY,
    IntensityLevel,
    PlanMode,
    ProposalStatus,
)
from ...domain.value_objects.plan_window import PlanWindow
from ...domain.value_objects.planned_block import DEFAULT_BLOCK_COLOR, PlannedBlock
from ...domain.value_objects.subject_profile import SubjectProfile
from ...domain.value_objects.subject_tag import parse_tags
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


class ConsultantNoteMapper:
    @staticmethod
    def to_entity(row: m.ConsultantStudentNoteModel) -> ConsultantNote:
        return ConsultantNote(
            id=row.id,
            school_id=row.school_id,
            consultant_id=row.consultant_id,
            student_id=row.student_id,
            body=row.body,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def to_model(entity: ConsultantNote) -> m.ConsultantStudentNoteModel:
        return m.ConsultantStudentNoteModel(
            id=entity.id,
            school_id=entity.school_id,
            consultant_id=entity.consultant_id,
            student_id=entity.student_id,
            body=entity.body,
        )


class DirectMessageMapper:
    @staticmethod
    def to_entity(row: m.ConsultantDirectMessageModel) -> DirectMessage:
        return DirectMessage(
            id=row.id,
            school_id=row.school_id,
            consultant_id=row.consultant_id,
            student_id=row.student_id,
            sender_role=MessageSender(row.sender_role),
            body=row.body,
            created_at=row.created_at,
        )

    @staticmethod
    def to_model(entity: DirectMessage) -> m.ConsultantDirectMessageModel:
        return m.ConsultantDirectMessageModel(
            id=entity.id,
            school_id=entity.school_id,
            consultant_id=entity.consultant_id,
            student_id=entity.student_id,
            sender_role=entity.sender_role.value,
            body=entity.body,
        )


class SubjectProfileMapper:
    @staticmethod
    def to_entity(row: m.SubjectProfileModel) -> SubjectProfile:
        return SubjectProfile(
            name=row.name,
            tags=parse_tags(row.tags),
            cognitive_load=row.cognitive_load,
            default_priority=row.default_priority,
            default_movability=row.default_movability,
        )

    @staticmethod
    def apply_to_model(entity: SubjectProfile, row: m.SubjectProfileModel) -> None:
        row.name = entity.name
        row.tags = list(entity.tag_values)
        row.cognitive_load = entity.cognitive_load
        row.default_priority = entity.default_priority
        row.default_movability = entity.default_movability


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
            'color': block.color,
            'priority': block.priority,
            'movability': block.movability,
            'activity': block.activity.value,
            'tags': list(block.tag_values),
            'cognitive_load': block.cognitive_load,
            'item_id': block.item_id,
        }

    @staticmethod
    def load(data: dict) -> PlannedBlock:
        # پیشنهادهای ثبت‌شده پیش از افزوده‌شدن اولویت این کلیدها را ندارند؛
        # پیش‌فرض‌ها همان مقادیر خنثای بلوک‌اند تا اینباکس دانش‌آموز نشکند.
        return PlannedBlock(
            date=JalaliDate(data['jy'], data['jm'], data['jd']),
            slot=TimeRange(data['start_minutes'], data['end_minutes']),
            subject=data['subject'],
            color=data.get('color') or DEFAULT_BLOCK_COLOR,
            priority=data.get('priority', DEFAULT_PRIORITY),
            movability=data.get('movability', DEFAULT_MOVABILITY),
            activity=_parse_activity(data.get('activity')),
            tags=parse_tags(data.get('tags')),
            cognitive_load=data.get('cognitive_load', 2),
            item_id=data.get('item_id', ''),
        )


def _parse_activity(value) -> ActivityKind:
    try:
        return ActivityKind(value)
    except ValueError:
        return ActivityKind.STUDY


class PlanProposalMapper:
    @staticmethod
    def to_entity(row: m.PlanProposalModel) -> PlanProposal:
        run = getattr(row, 'plan_run', None)
        summary = getattr(run, 'summary', None) or {}
        mode_value = getattr(run, 'mode', None)
        try:
            mode = PlanMode(mode_value) if mode_value else PlanMode.SUGGESTED
        except ValueError:
            mode = PlanMode.SUGGESTED
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
            block_decisions=tuple(row.block_decisions or ()),
            notice_seen_at=row.notice_seen_at,
            consultant_id=getattr(run, 'consultant_id', 0) or 0,
            goal_message=str(summary.get('goal_message') or ''),
            mode=mode,
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
