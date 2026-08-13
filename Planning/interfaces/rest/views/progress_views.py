"""اندپوینت گزارش پیشرفت — منبع مشترک دانش‌آموز، مشاور و مدیر.

بدون ``?user=`` گزارش خودِ کاربر برمی‌گردد؛ با آن، مشاور/مدیر همان مدرسه گزارش
دانش‌آموز را می‌بینند. محاسبه‌ی today/week/month با مرز روز تهران است تا با پنل
دانش‌آموز بیت‌به‌بیت یکی باشد.
"""
from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ....container import get_container
from ..context import build_context, resolve_calendar_owner
from ..errors import BasePlanningView
from ..params import (
    parse_optional_gregorian_date,
    parse_optional_int,
    parse_required_gregorian_date,
)
from ..serializers import actual_calendar_to_dict, daily_report_to_dict, progress_to_dict


class StudentProgressView(BasePlanningView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        report = get_container().progress_service.get_progress(
            owner_id, context=build_context(request),
        )
        return Response(progress_to_dict(report))


class StudentDailyReportView(BasePlanningView):
    """ریزفعالیت یک روز — ``?date=YYYY-MM-DD`` و اختیاری ``?user=``."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        day = parse_required_gregorian_date(request, 'date')
        report = get_container().progress_service.get_daily_report(
            owner_id, day, context=build_context(request),
        )
        return Response(daily_report_to_dict(report))


class StudentActualCalendarView(BasePlanningView):
    """تقویم عملی (C_actual) — لاگ‌های انجام‌شده، جدا از تقویم برنامه‌ریزی.

    بازه اختیاری ``?from=&to=`` به شکل YYYY-MM-DD؛ بدون آن ماه شمسی جاری است.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        report = get_container().progress_service.get_actual_calendar(
            owner_id,
            context=build_context(request),
            date_from=parse_optional_gregorian_date(request, 'from'),
            date_to=parse_optional_gregorian_date(request, 'to'),
        )
        return Response(actual_calendar_to_dict(report))
