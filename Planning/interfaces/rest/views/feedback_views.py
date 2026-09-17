"""اندپوینت بازخورد پایان بلوک — ورودی حلقه‌ی گیمیفیکیشن.

دانش‌آموز پس از هر بلوک با یک کلیک ستاره می‌دهد؛ همین داده است که ضریب بازدهی و
نیم‌رخ ساعتی او را می‌سازد و اجرای بعدی موتور را دقیق‌تر می‌کند.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ....container import get_container
from ..context import resolve_calendar_owner
from ..errors import BasePlanningView
from ..params import parse_optional_int
from ..serializers import BlockFeedbackSerializer


class BlockFeedbackView(BasePlanningView):
    permission_classes = [IsAuthenticated]

    @property
    def service(self):
        return get_container().feedback_service

    def get(self, request):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        return Response(self.service.summary(owner_id))

    def post(self, request):
        serializer = BlockFeedbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.service.submit(request.user.id, serializer.validated_data)
        return Response(result, status=status.HTTP_201_CREATED)
