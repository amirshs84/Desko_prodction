"""اندپوینت ترجیحات و تنظیمات مشاور."""
from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ..context import build_context
from ..errors import BasePlanningView


class ConsultantPreferencesView(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request):
        payload = get_container().preferences_service.get(
            context=build_context(request),
        )
        return Response(payload)

    def patch(self, request):
        payload = get_container().preferences_service.update(
            context=build_context(request),
            patch=request.data if isinstance(request.data, dict) else {},
        )
        return Response(payload)
