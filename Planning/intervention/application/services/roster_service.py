"""فهرست دانش‌آموزان مدرسه از نگاه مشاور.

خروجی، فهرست دانش‌آموزان به‌همراه «گروه‌های همین مشاور که هر دانش‌آموز عضو آن‌هاست»
است؛ چون کار اصلی مشاور در این صفحه دسته‌بندی کردن است و بدون این حاشیه‌نویسی،
باید برای هر دانش‌آموز حدس بزند کجاست.
"""
from __future__ import annotations

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import (
    SchoolDirectory,
    StudentFilter,
)
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError
from ...domain.repositories.student_group_repository import StudentGroupRepository
from ..dto.group_dto import RosterEntryDTO


class RosterService:
    def __init__(
        self,
        *,
        groups: StudentGroupRepository,
        directory: SchoolDirectory,
    ) -> None:
        self._groups = groups
        self._directory = directory

    def list_students(
        self, *, context: RequestContext, filters: StudentFilter | None = None,
    ) -> list[RosterEntryDTO]:
        school_id = _require_school_staff(context)
        students = self._directory.list_students(school_id, filters=filters)

        groups_by_student: dict[int, list[tuple[int, str]]] = {}
        if context.authority is WriteAuthority.CONSULTANT:
            for group in self._groups.list_for_consultant(context.actor_user_id):
                for student_id in group.member_ids:
                    groups_by_student.setdefault(student_id, []).append((group.id, group.name))

        return [
            RosterEntryDTO(
                student=student,
                groups=tuple(sorted(groups_by_student.get(student.user_id, []))),
            )
            for student in students
        ]


def _require_school_staff(context: RequestContext) -> int:
    if context.authority not in (WriteAuthority.CONSULTANT, WriteAuthority.SCHOOL_MANAGER):
        raise PermissionDeniedError('دیدن فهرست دانش‌آموزان مدرسه مجاز نیست.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
