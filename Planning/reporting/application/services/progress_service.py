"""Use-case خواندن گزارش پیشرفت.

تنها مسیر خواندن آمار مطالعه برای دانش‌آموز، مشاور و مدیر. محاسبه‌ی پنجره‌ها در
``progress_builder`` است؛ این سرویس فقط دسترسی را چک می‌کند و داده را جمع می‌آورد.
"""
from __future__ import annotations

from datetime import datetime
from typing import Callable

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, SchoolMismatchError
from ..dto.progress_dto import StudentProgressDTO
from ..iran_clock import DEFAULT_HEATMAP_DAYS, IRAN_TZ
from ..ports.study_report_reader import StudyReportReader
from ..progress_builder import build_progress_report


class ProgressService:
    def __init__(
        self,
        *,
        reports: StudyReportReader,
        directory: SchoolDirectory,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self._reports = reports
        self._directory = directory
        # تزریق‌پذیر برای تست؛ پیش‌فرض: الانِ تهران.
        self._clock = clock or (lambda: datetime.now(IRAN_TZ))

    def get_progress(
        self,
        owner_id: int,
        *,
        context: RequestContext,
        heatmap_days: int = DEFAULT_HEATMAP_DAYS,
    ) -> StudentProgressDTO:
        self._ensure_can_view(owner_id, context)
        student = self._directory.get_student(owner_id)
        # مشاور/مدیر فقط دانش‌آموز هم‌مدرسه؛ دانش‌آموز فقط خودش (بالا چک شد).
        if context.authority in (WriteAuthority.CONSULTANT, WriteAuthority.SCHOOL_MANAGER):
            if student.school_id != context.school_id:
                raise SchoolMismatchError()
        sessions = self._reports.list_sessions(owner_id)
        return build_progress_report(
            student, sessions, now=self._clock(), heatmap_days=heatmap_days,
        )

    @staticmethod
    def _ensure_can_view(owner_id: int, context: RequestContext) -> None:
        if context.authority is WriteAuthority.STUDENT:
            if owner_id != context.actor_user_id:
                raise PermissionDeniedError('دانش‌آموز فقط گزارش پیشرفت خودش را می‌بیند.')
            return
        if context.authority in (WriteAuthority.CONSULTANT, WriteAuthority.SCHOOL_MANAGER):
            if context.school_id is None:
                raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
            return
        raise PermissionDeniedError('نقش کاربری شما برای دیدن گزارش پیشرفت مجاز نیست.')
