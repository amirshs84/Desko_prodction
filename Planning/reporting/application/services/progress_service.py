"""Use-case خواندن گزارش پیشرفت.

تنها مسیر خواندن آمار مطالعه برای دانش‌آموز، مشاور و مدیر. محاسبه‌ی پنجره‌ها در
``progress_builder`` است؛ این سرویس فقط دسترسی را چک می‌کند و داده را جمع می‌آورد.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Callable

from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory, StudentInfo
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, SchoolMismatchError, ValidationError
from ..activity_builders import build_actual_calendar, build_daily_report
from ..dto.progress_dto import ActualCalendarDTO, DailyReportDTO, StudentProgressDTO
from ..iran_clock import DEFAULT_HEATMAP_DAYS, IRAN_TZ, iran_day_bounds
from ..ports.study_report_reader import StudyReportReader
from ..progress_builder import build_progress_report

MAX_ACTUAL_CALENDAR_SPAN_DAYS = 93


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
        student = self._load_visible_student(owner_id, context)
        sessions = self._reports.list_sessions(owner_id)
        return build_progress_report(
            student, sessions, now=self._clock(), heatmap_days=heatmap_days,
        )

    def get_daily_report(
        self,
        owner_id: int,
        day: date,
        *,
        context: RequestContext,
    ) -> DailyReportDTO:
        student = self._load_visible_student(owner_id, context)
        start, until = iran_day_bounds(day)
        sessions = self._reports.list_sessions(owner_id, since=start, until=until)
        return build_daily_report(student, sessions, day=day)

    def get_actual_calendar(
        self,
        owner_id: int,
        *,
        context: RequestContext,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> ActualCalendarDTO:
        student = self._load_visible_student(owner_id, context)
        date_from, date_to = self._resolve_actual_range(date_from, date_to)
        start, _ = iran_day_bounds(date_from)
        _, until = iran_day_bounds(date_to)
        sessions = self._reports.list_sessions(owner_id, since=start, until=until)
        return build_actual_calendar(
            student, sessions, date_from=date_from, date_to=date_to,
        )

    def _load_visible_student(self, owner_id: int, context: RequestContext) -> StudentInfo:
        self._ensure_can_view(owner_id, context)
        student = self._directory.get_student(owner_id)
        if context.authority in (WriteAuthority.CONSULTANT, WriteAuthority.SCHOOL_MANAGER):
            if student.school_id != context.school_id:
                raise SchoolMismatchError()
        return student

    def _resolve_actual_range(
        self, date_from: date | None, date_to: date | None,
    ) -> tuple[date, date]:
        if date_from is None and date_to is None:
            today = self._clock().astimezone(IRAN_TZ).date()
            jalali = JalaliDate.from_gregorian(today)
            date_from = JalaliDate(jalali.jy, jalali.jm, 1).to_gregorian()
            next_month = (
                JalaliDate(jalali.jy + 1, 1, 1)
                if jalali.jm == 12
                else JalaliDate(jalali.jy, jalali.jm + 1, 1)
            )
            date_to = next_month.to_gregorian() - timedelta(days=1)
        elif date_from is None or date_to is None:
            raise ValidationError('پارامترهای from و to باید هر دو باشند یا هیچ‌کدام.')
        if date_from > date_to:
            raise ValidationError('بازه تقویم عملی نامعتبر است: from بعد از to است.')
        span = (date_to - date_from).days + 1
        if span > MAX_ACTUAL_CALENDAR_SPAN_DAYS:
            raise ValidationError(
                f'بازه تقویم عملی حداکثر {MAX_ACTUAL_CALENDAR_SPAN_DAYS} روز است.',
                meta={'span_days': span, 'max': MAX_ACTUAL_CALENDAR_SPAN_DAYS},
            )
        return date_from, date_to

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
