"""فهرست دانش‌آموزان مدرسه از نگاه مشاور (Roster CRM).

علاوه بر گروه‌ها، متریک مطالعه بازه زمانی و برچسب‌ها را برای جدول غنی برمی‌گرداند.
"""
from __future__ import annotations

from datetime import datetime

from ....reporting.application.iran_clock import ReportWindows
from ....reporting.application.ports.study_report_reader import StudyReportReader
from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import (
    SchoolDirectory,
    StudentFilter,
)
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ...domain.repositories.student_group_repository import StudentGroupRepository
from ..dto.roster_dto import (
    ROSTER_COLUMNS,
    RosterMetricsDTO,
    RosterPageDTO,
    RosterRowDTO,
    build_tags,
    performance_score,
)

_VALID_PERIODS = frozenset({'daily', 'weekly', 'monthly'})


class RosterService:
    def __init__(
        self,
        *,
        groups: StudentGroupRepository,
        directory: SchoolDirectory,
        reports: StudyReportReader,
        clock=datetime.now,
    ) -> None:
        self._groups = groups
        self._directory = directory
        self._reports = reports
        self._clock = clock

    def list_students(
        self,
        *,
        context: RequestContext,
        filters: StudentFilter | None = None,
        period: str = 'weekly',
        min_study_hours: float | None = None,
        tag: str | None = None,
    ) -> RosterPageDTO:
        school_id = _require_school_staff(context)
        period = (period or 'weekly').lower()
        if period not in _VALID_PERIODS:
            raise ValidationError(
                'بازه زمانی نامعتبر است.',
                meta={'period': period, 'allowed': sorted(_VALID_PERIODS)},
            )

        students = self._directory.list_students(school_id, filters=filters)
        groups_by_student: dict[int, list[tuple[int, str]]] = {}
        if context.authority is WriteAuthority.CONSULTANT:
            for group in self._groups.list_for_consultant(context.actor_user_id):
                for student_id in group.member_ids:
                    groups_by_student.setdefault(student_id, []).append((group.id, group.name))

        windows = ReportWindows.at(self._clock())
        since = {
            'daily': windows.today_start,
            'weekly': windows.week_start,
            'monthly': windows.month_start,
        }[period]

        aggregates = self._reports.aggregate_for_users(
            [student.user_id for student in students],
            since=since,
        )

        rows: list[RosterRowDTO] = []
        tag_norm = _normalize_tag(tag) if tag else None
        min_seconds = int(min_study_hours * 3600) if min_study_hours is not None else None

        for student in students:
            agg = aggregates.get(student.user_id)
            study_seconds = agg.total_seconds if agg else 0
            session_count = agg.session_count if agg else 0
            metrics = RosterMetricsDTO(
                study_seconds=study_seconds,
                session_count=session_count,
                test_count=None,
                last_exam_status=None,
                performance=performance_score(study_seconds, period=period),
            )
            tags = build_tags(student)

            if min_seconds is not None and study_seconds < min_seconds:
                continue
            if tag_norm and tag_norm not in {_normalize_tag(t) for t in tags}:
                continue

            rows.append(
                RosterRowDTO(
                    student=student,
                    groups=tuple(sorted(groups_by_student.get(student.user_id, []))),
                    metrics=metrics,
                    tags=tags,
                )
            )

        return RosterPageDTO(
            period=period,
            columns=ROSTER_COLUMNS,
            rows=tuple(rows),
        )


def _normalize_tag(tag: str) -> str:
    cleaned = (tag or '').strip()
    if not cleaned:
        return ''
    if not cleaned.startswith('#'):
        cleaned = f'#{cleaned}'
    return cleaned.casefold()


def _require_school_staff(context: RequestContext) -> int:
    if context.authority not in (WriteAuthority.CONSULTANT, WriteAuthority.SCHOOL_MANAGER):
        raise PermissionDeniedError('دیدن فهرست دانش‌آموزان مدرسه مجاز نیست.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
