"""اندپوینت‌های رویداد ثابت کلاس (فقط مدیر مدرسه).

مدیر یک‌بار برنامه‌ی کلاس را تعریف می‌کند و سیستم آن را روی تقویم همه‌ی دانش‌آموزان
آن کلاس می‌نشاند. این رویدادها ستون ثابت تقویم‌اند: مشاور و موتور برنامه‌ریزی
باید دور آن‌ها برنامه بچینند.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsManager

from ....container import get_container
from ....scheduling.application.commands.fixed_event_commands import (
    CreateClassFixedEventsCommand,
    DeleteFixedEventGroupCommand,
)
from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ....scheduling.domain.value_objects.weekly_recurrence import WeeklyRecurrence
from ..context import build_context
from ..errors import BasePlanningView
from ..serializers import ClassFixedEventCreateSerializer, fixed_event_group_to_dict


class _ClassFixedEventViewBase(BasePlanningView):
    permission_classes = [IsAuthenticated, IsManager]

    @property
    def service(self):
        return get_container().class_fixed_event_service


class ClassFixedEventListCreateView(_ClassFixedEventViewBase):
    def get(self, request, class_id):
        groups = self.service.list_groups_for_class(
            int(class_id), context=build_context(request),
        )
        return Response([fixed_event_group_to_dict(group) for group in groups])

    def post(self, request, class_id):
        serializer = ClassFixedEventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        command = CreateClassFixedEventsCommand(
            class_id=int(class_id),
            title=data['title'],
            description=data['description'],
            color=data['color'],
            slot=TimeRange(data['start_minutes'], data['end_minutes']),
            dates=tuple(_to_jalali(item) for item in data.get('dates') or ()),
            recurrence=_to_recurrence(data.get('recurrence')),
        )
        result = self.service.create_for_class(command, context=build_context(request))
        return Response(
            {
                'group_id': result.group_id,
                'created_count': result.created_count,
                'skipped_count': result.skipped_count,
                'student_count': result.student_count,
                'dates': [{'jy': day.jy, 'jm': day.jm, 'jd': day.jd} for day in result.dates],
            },
            status=status.HTTP_201_CREATED,
        )


class ClassFixedEventGroupDetailView(_ClassFixedEventViewBase):
    def delete(self, request, class_id, group_id):
        deleted = self.service.delete_group(
            DeleteFixedEventGroupCommand(class_id=int(class_id), group_id=group_id),
            context=build_context(request),
        )
        return Response({'deleted': deleted}, status=status.HTTP_200_OK)


def _to_jalali(item: dict) -> JalaliDate:
    return JalaliDate(item['jy'], item['jm'], item['jd'])


def _to_recurrence(data: dict | None) -> WeeklyRecurrence | None:
    if not data:
        return None
    return WeeklyRecurrence(
        weekdays=tuple(data['weekdays']),
        start=_to_jalali(data['start']),
        end=_to_jalali(data['end']),
    )
