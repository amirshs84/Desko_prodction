"""اندپوینت‌های گروه‌بندی و فهرست دانش‌آموزان برای مشاور.

گروه‌ها خصوصی‌اند: هر مشاور فقط گروه‌های خودش را می‌بیند، حتی اگر مشاور دیگری در
همان مدرسه باشد. یک دانش‌آموز می‌تواند در چند گروه عضو باشد.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ....intervention.application.commands.group_commands import (
    ChangeMembersCommand,
    CreateGroupCommand,
    UpdateGroupCommand,
)
from ....shared.application.ports.school_directory import StudentFilter
from ..context import build_context
from ..errors import BasePlanningView
from ..serializers import (
    GroupCreateSerializer,
    GroupMembersSerializer,
    GroupUpdateSerializer,
    group_to_dict,
    roster_page_to_dict,
)


class _ConsultantViewBase(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]

    @property
    def groups(self):
        return get_container().group_service


class ConsultantRosterView(_ConsultantViewBase):
    """فهرست دانش‌آموزان مدرسه با متریک مطالعه، ستون‌های پویا و فیلتر ترکیبی."""

    def get(self, request):
        query = request.query_params
        min_hours_raw = (query.get('min_study_hours') or '').strip()
        min_study_hours = None
        if min_hours_raw:
            try:
                min_study_hours = float(min_hours_raw)
            except ValueError:
                min_study_hours = None

        page = get_container().roster_service.list_students(
            context=build_context(request),
            filters=StudentFilter(
                search=query.get('search') or None,
                grade=query.get('grade') or None,
                class_id=int(query['class_id']) if (query.get('class_id') or '').isdigit() else None,
            ),
            period=query.get('period') or 'weekly',
            min_study_hours=min_study_hours,
            tag=query.get('tag') or None,
        )
        payload = roster_page_to_dict(page)
        if (query.get('flat') or '').strip() in ('1', 'true', 'yes'):
            return Response(payload['students'])
        return Response(payload)


class ConsultantGroupListCreateView(_ConsultantViewBase):
    def get(self, request):
        groups = self.groups.list_groups(context=build_context(request))
        return Response([group_to_dict(group) for group in groups])

    def post(self, request):
        serializer = GroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        group = self.groups.create_group(
            CreateGroupCommand(
                name=data['name'],
                description=data['description'],
                member_ids=tuple(data['member_ids']),
            ),
            context=build_context(request),
        )
        return Response(group_to_dict(group), status=status.HTTP_201_CREATED)


class ConsultantGroupDetailView(_ConsultantViewBase):
    def get(self, request, group_id):
        group = self.groups.get_group(group_id, context=build_context(request))
        return Response(group_to_dict(group))

    def patch(self, request, group_id):
        serializer = GroupUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        group = self.groups.update_group(
            UpdateGroupCommand(group_id=group_id, **serializer.validated_data),
            context=build_context(request),
        )
        return Response(group_to_dict(group))

    def delete(self, request, group_id):
        self.groups.delete_group(group_id, context=build_context(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConsultantGroupMembersView(_ConsultantViewBase):
    def post(self, request, group_id):
        serializer = GroupMembersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        replace = data.get('member_ids')
        group = self.groups.change_members(
            ChangeMembersCommand(
                group_id=group_id,
                add_ids=tuple(data['add']),
                remove_ids=tuple(data['remove']),
                replace_ids=tuple(replace) if replace is not None else None,
            ),
            context=build_context(request),
        )
        return Response(group_to_dict(group))
