"""اندپوینت‌های تقویم — همان قرارداد فعلی دانش‌آموز، حالا روی لایه‌ی دامنه.

مسیرها و شکل داده عیناً حفظ شده‌اند (``/api/calendar-events/...``) تا فرانت‌اند
موجود دست‌نخورده کار کند. دو تغییر رفتاری هدفمند وجود دارد:

  1. رویدادهای ثابت مدرسه دیده می‌شوند اما قابل ویرایش/حذف نیستند (خطای
     ``IMMUTABLE_EVENT_VIOLATION``).
  2. پارامتر اختیاری ``?user=<id>`` به مشاور/مدیر همان مدرسه اجازه می‌دهد تقویم یک
     دانش‌آموز را ببیند و ویرایش کند؛ برای دانش‌آموز بی‌اثر و برای کاربر مدرسه‌ی
     دیگر ممنوع است.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ....container import get_container
from ....scheduling.application.commands.calendar_commands import (
    CreateEventsCommand,
    EventDraft,
    UpdateEventCommand,
    UpdateGroupCommand,
)
from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....scheduling.domain.value_objects.time_range import TimeRange
from ..context import build_context, resolve_calendar_owner
from ..errors import BasePlanningView
from ..params import parse_optional_date, parse_optional_int
from ..serializers import (
    CalendarEventCreateSerializer,
    CalendarEventGroupPatchSerializer,
    CalendarEventPatchSerializer,
    event_to_dict,
)


class _CalendarViewBase(BasePlanningView):
    permission_classes = [IsAuthenticated]

    @property
    def service(self):
        return get_container().calendar_service

    def owner_id(self, request) -> int:
        return resolve_calendar_owner(request, parse_optional_int(request, 'user'))


class CalendarEventListCreateView(_CalendarViewBase):
    def get(self, request):
        events = self.service.list_events(
            self.owner_id(request),
            date_from=parse_optional_date(request, 'from'),
            date_to=parse_optional_date(request, 'to'),
        )
        return Response([event_to_dict(event) for event in events])

    def post(self, request):
        many = isinstance(request.data, list)
        serializer = CalendarEventCreateSerializer(data=request.data, many=many)
        serializer.is_valid(raise_exception=True)
        items = serializer.validated_data if many else [serializer.validated_data]

        command = CreateEventsCommand(
            owner_id=self.owner_id(request),
            drafts=tuple(_to_draft(item) for item in items),
        )
        events = self.service.create_events(command, context=build_context(request))
        payload = [event_to_dict(event) for event in events]
        return Response(payload if many else payload[0], status=status.HTTP_201_CREATED)


class CalendarEventDetailView(_CalendarViewBase):
    def get(self, request, client_id):
        event = self.service.get_event(self.owner_id(request), client_id)
        return Response(event_to_dict(event))

    def patch(self, request, client_id):
        serializer = CalendarEventPatchSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        command = UpdateEventCommand(
            owner_id=self.owner_id(request),
            client_id=client_id,
            **serializer.validated_data,
        )
        event = self.service.update_event(command, context=build_context(request))
        return Response(event_to_dict(event))

    def delete(self, request, client_id):
        self.service.delete_event(
            self.owner_id(request), client_id, context=build_context(request),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class CalendarEventGroupView(_CalendarViewBase):
    def patch(self, request, group_id):
        serializer = CalendarEventGroupPatchSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        command = UpdateGroupCommand(
            owner_id=self.owner_id(request),
            group_id=group_id,
            **serializer.validated_data,
        )
        updated = self.service.update_group(command, context=build_context(request))
        return Response({'updated': updated})

    def delete(self, request, group_id):
        self.service.delete_group(
            self.owner_id(request), group_id, context=build_context(request),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _to_draft(item: dict) -> EventDraft:
    all_day = item['all_day']
    return EventDraft(
        client_id=item['client_id'],
        group_id=item['group_id'],
        date=JalaliDate(item['jy'], item['jm'], item['jd']),
        slot=(
            TimeRange.full_day() if all_day
            else TimeRange(item['start_minutes'], item['end_minutes'])
        ),
        title=item['title'],
        description=item['description'],
        color=item['color'],
        all_day=all_day,
    )
