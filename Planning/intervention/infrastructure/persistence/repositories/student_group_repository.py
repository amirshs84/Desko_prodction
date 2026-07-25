"""پیاده‌سازی مخزن گروه دانش‌آموزی روی Django ORM.

همگام‌سازی اعضا تفاضلی است (فقط تفاضل مجموعه‌ها درج/حذف می‌شود) تا ویرایش یک گروه
۳۰۰ نفره، ۳۰۰ ردیف را بی‌دلیل بازنویسی نکند و تاریخ ``added_at`` اعضای قدیمی حفظ
شود.
"""
from __future__ import annotations

from django.db import IntegrityError
from django.db.models import Prefetch

from .....shared.domain.errors import ConflictError, NotFoundError
from ....domain.entities.student_group import StudentGroup
from ....domain.repositories.student_group_repository import StudentGroupRepository
from .. import models as m
from ..mappers import StudentGroupMapper

_DUPLICATE_NAME_MESSAGE = 'گروهی با همین نام از قبل دارید.'


class DjangoStudentGroupRepository(StudentGroupRepository):
    def add(self, group: StudentGroup) -> StudentGroup:
        row = StudentGroupMapper.to_model(group)
        try:
            row.save()
        except IntegrityError as exc:
            raise ConflictError(_DUPLICATE_NAME_MESSAGE, meta={'name': group.name}) from exc

        self._insert_members(row.id, group.member_ids)
        group.id = row.id
        group.created_at = row.created_at
        return group

    def get(self, group_id: int, *, consultant_id: int) -> StudentGroup:
        row = (
            self._base_queryset()
            .filter(id=group_id, consultant_id=consultant_id)
            .first()
        )
        if row is None:
            raise NotFoundError('گروه مورد نظر یافت نشد.', meta={'group_id': group_id})
        return self._to_entity(row)

    def list_for_consultant(self, consultant_id: int) -> list[StudentGroup]:
        rows = self._base_queryset().filter(consultant_id=consultant_id)
        return [self._to_entity(row) for row in rows]

    def save(self, group: StudentGroup) -> None:
        try:
            updated = m.StudentGroupModel.objects.filter(
                id=group.id, consultant_id=group.consultant_id,
            ).update(name=group.name, description=group.description)
        except IntegrityError as exc:
            raise ConflictError(_DUPLICATE_NAME_MESSAGE, meta={'name': group.name}) from exc
        if updated == 0:
            raise NotFoundError('گروه مورد نظر یافت نشد.', meta={'group_id': group.id})
        self._sync_members(group)

    def delete(self, group_id: int, *, consultant_id: int) -> None:
        deleted, _ = m.StudentGroupModel.objects.filter(
            id=group_id, consultant_id=consultant_id,
        ).delete()
        if deleted == 0:
            raise NotFoundError('گروه مورد نظر یافت نشد.', meta={'group_id': group_id})

    # ---------- کمکی‌ها ----------

    @staticmethod
    def _base_queryset():
        return m.StudentGroupModel.objects.prefetch_related(
            Prefetch(
                'memberships',
                queryset=m.StudentGroupMemberModel.objects.only('group_id', 'student_id'),
            )
        )

    @staticmethod
    def _to_entity(row: m.StudentGroupModel) -> StudentGroup:
        member_ids = {membership.student_id for membership in row.memberships.all()}
        return StudentGroupMapper.to_entity(row, member_ids)

    @staticmethod
    def _insert_members(group_id: int, member_ids: set[int]) -> None:
        if not member_ids:
            return
        m.StudentGroupMemberModel.objects.bulk_create(
            [
                m.StudentGroupMemberModel(group_id=group_id, student_id=student_id)
                for student_id in sorted(member_ids)
            ],
            ignore_conflicts=True,
        )

    def _sync_members(self, group: StudentGroup) -> None:
        current = set(
            m.StudentGroupMemberModel.objects.filter(group_id=group.id)
            .values_list('student_id', flat=True)
        )
        self._insert_members(group.id, group.member_ids - current)
        removed = current - group.member_ids
        if removed:
            m.StudentGroupMemberModel.objects.filter(
                group_id=group.id, student_id__in=sorted(removed),
            ).delete()
