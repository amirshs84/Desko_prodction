"""اندپوینت‌های تقویم مشاور: پنل بلوک‌ها، فضای خالی روز، جای‌گذاری و جابه‌جایی.

همان قاعده‌ی دسترسی تقویم برقرار است: بدون ``?user=`` روی تقویم خودِ کاربر کار
می‌کنند و با آن، مشاور/مدیر روی تقویم دانش‌آموز همان مدرسه. تفاوت با اندپوینت‌های
قدیمی این است که اینجا سرور جای نهایی بلوک را تعیین می‌کند و پاسخ می‌گوید آیا
جای‌گذاری snap شده یا نه.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ....container import get_container
from ....scheduling.application.commands.block_commands import (
    MoveBlockCommand,
    PlaceBlockCommand,
)
from ....scheduling.domain.value_objects.block_template import get_template
from ..context import build_context, resolve_calendar_owner
from ..errors import BasePlanningView
from ..params import parse_jalali_date, parse_optional_int, parse_required_date
from ..serializers import (
    MoveBlockSerializer,
    PlaceBlockSerializer,
    availability_to_dict,
    block_template_to_dict,
    placement_to_dict,
)


class _BlockViewBase(BasePlanningView):
    permission_classes = [IsAuthenticated]

    @property
    def service(self):
        return get_container().block_placement_service

    def owner_id(self, request) -> int:
        return resolve_calendar_owner(request, parse_optional_int(request, 'user'))


class BlockTemplateListView(_BlockViewBase):
    """پنل بلوک‌های آماده (پیش‌فرض: بلوک مطالعه‌ی ۹۰ دقیقه‌ای)."""

    def get(self, request):
        templates = self.service.list_templates()
        return Response([block_template_to_dict(template) for template in templates])


class DayAvailabilityView(_BlockViewBase):
    """فضای خالی یک روز داخل پنجره‌ی بیداری — ورودی نمایش «جاهای قابل استفاده» در UI."""

    def get(self, request):
        min_duration = parse_optional_int(request, 'duration') or 1
        availability = self.service.day_availability(
            self.owner_id(request),
            parse_required_date(request, 'date'),
            min_duration=min_duration,
        )
        return Response(availability_to_dict(availability))


class PlaceBlockView(_BlockViewBase):
    def post(self, request):
        serializer = PlaceBlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        template = get_template(data['template']) if data['template'] else None
        result = self.service.place_block(
            PlaceBlockCommand(
                owner_id=self.owner_id(request),
                date=parse_jalali_date(data['date']),
                duration_minutes=data.get('duration_minutes') or template.duration_minutes,
                title=data['title'] or (template.title if template else ''),
                color=data['color'] or (template.color if template else ''),
                description=data['description'],
                group_id=data['group_id'],
                client_id=data['client_id'],
                preferred_start_minutes=data.get('start_minutes'),
                snap=data['snap'],
            ),
            context=build_context(request),
        )
        return Response(placement_to_dict(result), status=status.HTTP_201_CREATED)


class MoveBlockView(_BlockViewBase):
    def post(self, request, client_id):
        serializer = MoveBlockSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        result = self.service.move_block(
            MoveBlockCommand(
                owner_id=self.owner_id(request),
                client_id=client_id,
                date=parse_jalali_date(data['date']) if data['date'] else None,
                start_minutes=data.get('start_minutes'),
                snap=data['snap'],
                expected_version=data.get('expected_version'),
            ),
            context=build_context(request),
        )
        return Response(placement_to_dict(result))
