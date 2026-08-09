"""آداپتور دفترچه‌ی مدرسه روی مدل‌های اپ ``api``.

این تنها فایلی در اپ Planning است که به مدل‌های سازمانی اپ ``api`` (کلاس، عضویت،
پروفایل) وابسته است. اگر فردا ساختار کلاس‌ها عوض شد یا به سرویس جدا منتقل شد، فقط
همین آداپتور بازنویسی می‌شود و دامنه/use-case ها دست‌نخورده می‌مانند.
"""
from __future__ import annotations

from typing import Iterable

from django.db.models import Prefetch, Q

from api.models import ClassEnrollment, School, SchoolClass, UserProfile

from ..application.ports.school_directory import (
    ClassInfo,
    ConsultantInfo,
    StudentFilter,
    StudentInfo,
)
from ..domain.errors import NotFoundError


class DjangoSchoolDirectory:
    def get_class(self, class_id: int, *, school_id: int) -> ClassInfo:
        row = SchoolClass.objects.filter(id=class_id, school_id=school_id).first()
        if row is None:
            # پیام عمداً «یافت نشد» است، نه «دسترسی ندارید»، تا وجود کلاس‌های
            # مدارس دیگر برای مدیر این مدرسه فاش نشود.
            raise NotFoundError('کلاس مورد نظر یافت نشد.', meta={'class_id': class_id})
        return ClassInfo(
            id=row.id,
            school_id=row.school_id,
            name=row.name,
            code=row.code,
            grade=row.grade,
        )

    def list_classes(self, school_id: int) -> list[ClassInfo]:
        rows = SchoolClass.objects.filter(
            school_id=school_id, is_active=True,
        ).order_by('grade', 'name', 'code')
        return [
            ClassInfo(
                id=row.id,
                school_id=row.school_id,
                name=row.name,
                code=row.code,
                grade=row.grade,
            )
            for row in rows
        ]

    def list_class_student_user_ids(self, class_id: int, *, school_id: int) -> list[int]:
        return list(
            ClassEnrollment.objects.filter(
                school_class_id=class_id,
                school_class__school_id=school_id,
                student__role='student',
                student__user__is_active=True,
            )
            .order_by('student__user_id')
            .values_list('student__user_id', flat=True)
        )

    def get_student(self, user_id: int) -> StudentInfo:
        profile = (
            UserProfile.objects.filter(user_id=user_id, role='student')
            .prefetch_related(self._class_prefetch())
            .first()
        )
        if profile is None:
            raise NotFoundError('دانش‌آموز مورد نظر یافت نشد.', meta={'user_id': user_id})
        return self._to_student_info(profile)

    def list_students(
        self, school_id: int, *, filters: StudentFilter | None = None,
    ) -> list[StudentInfo]:
        filters = filters or StudentFilter()
        queryset = UserProfile.objects.filter(
            role='student', school_id=school_id, user__is_active=True,
        )
        if filters.grade:
            queryset = queryset.filter(grade=filters.grade)
        if filters.class_id:
            queryset = queryset.filter(class_enrollments__school_class_id=filters.class_id)
        if filters.search:
            queryset = queryset.filter(
                Q(full_name__icontains=filters.search)
                | Q(phone_number__icontains=filters.search)
            )
        queryset = queryset.prefetch_related(self._class_prefetch()).order_by(
            'full_name', 'phone_number',
        )
        return [self._to_student_info(profile) for profile in queryset.distinct()]

    def list_students_by_ids(
        self, school_id: int, user_ids: Iterable[int],
    ) -> list[StudentInfo]:
        ids = list({int(user_id) for user_id in user_ids})
        if not ids:
            return []
        queryset = (
            UserProfile.objects.filter(
                user_id__in=ids, role='student', school_id=school_id, user__is_active=True,
            )
            .prefetch_related(self._class_prefetch())
            .order_by('full_name', 'phone_number')
        )
        return [self._to_student_info(profile) for profile in queryset]

    def list_consultants(self, school_id: int) -> list[ConsultantInfo]:
        queryset = UserProfile.objects.filter(
            role='consultant', school_id=school_id, user__is_active=True,
        ).order_by('full_name', 'phone_number')
        return [self._to_consultant_info(profile) for profile in queryset]

    def get_consultant(self, user_id: int, *, school_id: int) -> ConsultantInfo | None:
        profile = UserProfile.objects.filter(
            user_id=user_id,
            role='consultant',
            school_id=school_id,
            user__is_active=True,
        ).first()
        if profile is None:
            return None
        return self._to_consultant_info(profile)

    def get_school_name(self, school_id: int) -> str:
        name = (
            School.objects.filter(id=school_id)
            .values_list('name', flat=True)
            .first()
        )
        return name or ''

    # ---------- کمکی‌ها ----------

    @staticmethod
    def _class_prefetch() -> Prefetch:
        return Prefetch(
            'class_enrollments',
            queryset=ClassEnrollment.objects.select_related('school_class'),
        )

    @staticmethod
    def _to_student_info(profile: UserProfile) -> StudentInfo:
        return StudentInfo(
            user_id=profile.user_id,
            school_id=profile.school_id,
            full_name=profile.full_name,
            phone_number=profile.phone_number,
            grade=profile.grade,
            olympiad_field=profile.olympiad_field or '',
            class_names=tuple(
                enrollment.school_class.name
                for enrollment in profile.class_enrollments.all()
            ),
        )

    @staticmethod
    def _to_consultant_info(profile: UserProfile) -> ConsultantInfo:
        return ConsultantInfo(
            user_id=profile.user_id,
            school_id=profile.school_id,
            full_name=profile.full_name or profile.phone_number or f'مشاور #{profile.user_id}',
            phone_number=profile.phone_number or '',
        )
