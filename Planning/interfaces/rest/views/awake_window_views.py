"""اندپوینت بازه‌ی فعال شبانه‌روز دانش‌آموز.

خواندن برای مشاور و مدیر همان مدرسه هم باز است (با ``?user=``) تا بفهمند چرا
برنامه‌ی یک دانش‌آموز کوتاه‌تر درآمده، اما نوشتن فقط برای خود دانش‌آموز است: این
تنظیم درباره‌ی زندگی اوست، نه برنامه‌ی مشاور.
"""
from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ....container import get_container
from ....shared.domain.errors import PermissionDeniedError
from ..context import resolve_calendar_owner
from ..errors import BasePlanningView
from ..params import parse_optional_int
from ..serializers import AwakeWindowSerializer


class AwakeWindowView(BasePlanningView):
    permission_classes = [IsAuthenticated]

    @property
    def service(self):
        return get_container().awake_window_service

    def get(self, request):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        return Response(self.service.get(owner_id))

    def put(self, request):
        owner_id = _require_self(request)
        serializer = AwakeWindowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(self.service.update(owner_id, serializer.validated_data))

    def delete(self, request):
        owner_id = _require_self(request)
        return Response(self.service.reset(owner_id))


def _require_self(request) -> int:
    owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
    if owner_id != request.user.id:
        raise PermissionDeniedError(
            'بازه‌ی فعال را فقط خود دانش‌آموز می‌تواند تغییر دهد.'
        )
    return owner_id
