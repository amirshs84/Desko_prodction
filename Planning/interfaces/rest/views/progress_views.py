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
from ..params import parse_optional_int
from ..serializers import progress_to_dict


class StudentProgressView(BasePlanningView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        report = get_container().progress_service.get_progress(
            owner_id, context=build_context(request),
        )
        return Response(progress_to_dict(report))
