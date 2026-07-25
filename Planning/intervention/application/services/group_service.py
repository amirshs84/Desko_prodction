"""Use-case های گروه‌بندی دانش‌آموزان توسط مشاور.

سه قاعده‌ی دسترسی که همه‌ی متدها از آن عبور می‌کنند:
  1. فقط مشاور مالک گروه است (مدیر و دانش‌آموز اینجا کاری ندارند).
  2. مشاور باید به یک مدرسه متصل باشد.
  3. عضو گروه فقط دانش‌آموز فعال همان مدرسه می‌تواند باشد.

قاعده‌ی سوم در لایه‌ی application است نه دامنه، چون تشخیصش نیازمند پرس‌وجو از
دفترچه‌ی مدرسه است؛ دامنه فقط از «مجموعه‌ای از شناسه‌ها» خبر دارد.
"""
from __future__ import annotations

from typing import Callable, Iterable, Sequence

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory, StudentInfo
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ...domain.entities.student_group import StudentGroup
from ...domain.repositories.student_group_repository import StudentGroupRepository
from ..commands.group_commands import (
    ChangeMembersCommand,
    CreateGroupCommand,
    UpdateGroupCommand,
)
from ..dto.group_dto import StudentGroupDTO


class GroupService:
    def __init__(
        self,
        *,
        groups: StudentGroupRepository,
        directory: SchoolDirectory,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._groups = groups
        self._directory = directory
        self._uow_factory = uow_factory

    # ---------- خواندن ----------

    def list_groups(self, *, context: RequestContext) -> list[StudentGroupDTO]:
        school_id = _require_consultant(context)
        groups = self._groups.list_for_consultant(context.actor_user_id)
        if not groups:
            return []

        # یک کوئری برای اعضای همه‌ی گروه‌ها، نه یکی به‌ازای هر گروه.
        all_member_ids = {student_id for group in groups for student_id in group.member_ids}
        by_id = {
            student.user_id: student
            for student in self._directory.list_students_by_ids(school_id, all_member_ids)
        }
        return [self._to_dto(group, by_id) for group in groups]

    def get_group(self, group_id: int, *, context: RequestContext) -> StudentGroupDTO:
        school_id = _require_consultant(context)
        group = self._groups.get(group_id, consultant_id=context.actor_user_id)
        return self._to_dto(group, self._members_by_id(school_id, group.member_ids))

    def get_member_ids(self, group_id: int, *, context: RequestContext) -> list[int]:
        """شناسه‌ی اعضا — ورودی موتور برنامه‌ریزی گروهی در فازهای بعد."""
        _require_consultant(context)
        group = self._groups.get(group_id, consultant_id=context.actor_user_id)
        return sorted(group.member_ids)

    # ---------- نوشتن ----------

    def create_group(
        self, command: CreateGroupCommand, *, context: RequestContext,
    ) -> StudentGroupDTO:
        school_id = _require_consultant(context)
        members = self._validated_members(school_id, command.member_ids)
        group = StudentGroup.create(
            school_id=school_id,
            consultant_id=context.actor_user_id,
            name=command.name,
            description=command.description,
            member_ids=members.keys(),
        )
        with self._uow_factory():
            group = self._groups.add(group)
        return self._to_dto(group, members)

    def update_group(
        self, command: UpdateGroupCommand, *, context: RequestContext,
    ) -> StudentGroupDTO:
        school_id = _require_consultant(context)
        group = self._groups.get(command.group_id, consultant_id=context.actor_user_id)
        if command.name is not None:
            group.rename(command.name)
        if command.description is not None:
            group.describe(command.description)
        with self._uow_factory():
            self._groups.save(group)
        return self._to_dto(group, self._members_by_id(school_id, group.member_ids))

    def change_members(
        self, command: ChangeMembersCommand, *, context: RequestContext,
    ) -> StudentGroupDTO:
        school_id = _require_consultant(context)
        group = self._groups.get(command.group_id, consultant_id=context.actor_user_id)

        if command.replace_ids is not None:
            self._validated_members(school_id, command.replace_ids)
            group.replace_members(command.replace_ids)
        else:
            if command.add_ids:
                self._validated_members(school_id, command.add_ids)
                group.add_members(command.add_ids)
            if command.remove_ids:
                group.remove_members(command.remove_ids)

        with self._uow_factory():
            self._groups.save(group)
        return self._to_dto(group, self._members_by_id(school_id, group.member_ids))

    def delete_group(self, group_id: int, *, context: RequestContext) -> None:
        _require_consultant(context)
        with self._uow_factory():
            self._groups.delete(group_id, consultant_id=context.actor_user_id)

    # ---------- کمکی ----------

    def _validated_members(
        self, school_id: int, student_ids: Sequence[int],
    ) -> dict[int, StudentInfo]:
        if not student_ids:
            return {}
        found = {
            student.user_id: student
            for student in self._directory.list_students_by_ids(school_id, student_ids)
        }
        missing = sorted(set(student_ids) - set(found))
        if missing:
            raise ValidationError(
                'برخی از کاربران انتخاب‌شده دانش‌آموز فعال این مدرسه نیستند.',
                meta={'invalid_user_ids': missing},
            )
        return found

    def _members_by_id(
        self, school_id: int, member_ids: Iterable[int],
    ) -> dict[int, StudentInfo]:
        return {
            student.user_id: student
            for student in self._directory.list_students_by_ids(school_id, member_ids)
        }

    @staticmethod
    def _to_dto(group: StudentGroup, by_id: dict[int, StudentInfo]) -> StudentGroupDTO:
        # ترتیب همان ترتیب دفترچه (بر اساس نام) است تا UI مرتب بماند. عضوی که در
        # دفترچه نیست (مثلاً غیرفعال شده) نمایش داده نمی‌شود اما عضویتش پاک
        # نمی‌شود؛ پاک‌سازی تصمیم صریح مشاور است، نه اثر جانبی خواندن.
        members = tuple(
            student for student in by_id.values() if student.user_id in group.member_ids
        )
        return StudentGroupDTO.build(group, members)


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('گروه‌بندی دانش‌آموزان فقط در اختیار مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
