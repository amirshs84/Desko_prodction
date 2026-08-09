"""اندپوینت هاب گزارش و تحلیل مشاور."""
from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ..context import build_context
from ..errors import BasePlanningView


class ConsultantAnalyticsHubView(BasePlanningView):
    """تجمیع کلاس‌محور + رادار دروس + جریان کوهورت + تاریخچه اجراها."""

    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request):
        payload = get_container().analytics_hub_service.get_hub(
            context=build_context(request),
            period=request.query_params.get('period') or 'weekly',
        )
        return Response(payload)
