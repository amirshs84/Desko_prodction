"""اندپوینت پیشخوان مشاور (Command Center)."""
from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ..context import build_context
from ..errors import BasePlanningView


class ConsultantDashboardView(BasePlanningView):
    """خلاصه تریاژ روزانه — لیست‌ها سمت سرور کش می‌شوند."""

    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request):
        payload = get_container().dashboard_service.get_dashboard(
            context=build_context(request),
        )
        return Response(payload)
