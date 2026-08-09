"""اندپوینت‌های پروفایل دانش‌آموز برای مشاور: پیام مستقیم و یادداشت خصوصی."""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ....intervention.application.commands.message_commands import SendDirectMessageCommand
from ....intervention.application.commands.note_commands import (
    CreateNoteCommand,
    UpdateNoteCommand,
)
from ..context import build_context
from ..errors import BasePlanningView
from ..serializers import (
    DirectMessageCreateSerializer,
    NoteCreateSerializer,
    NoteUpdateSerializer,
    StudentReplyMessageSerializer,
    direct_message_to_dict,
    note_to_dict,
)


class _ConsultantProfileViewBase(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]


class ConsultantStudentNotesView(_ConsultantProfileViewBase):
    def get(self, request, user_id: int):
        notes = get_container().note_service.list_for_student(
            user_id, context=build_context(request),
        )
        return Response([note_to_dict(note) for note in notes])

    def post(self, request, user_id: int):
        serializer = NoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = get_container().note_service.create_note(
            CreateNoteCommand(student_id=user_id, body=serializer.validated_data['body']),
            context=build_context(request),
        )
        return Response(note_to_dict(note), status=status.HTTP_201_CREATED)


class ConsultantNoteDetailView(_ConsultantProfileViewBase):
    def patch(self, request, note_id: int):
        serializer = NoteUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = get_container().note_service.update_note(
            UpdateNoteCommand(note_id=note_id, body=serializer.validated_data['body']),
            context=build_context(request),
        )
        return Response(note_to_dict(note))

    def delete(self, request, note_id: int):
        get_container().note_service.delete_note(
            note_id, context=build_context(request),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConsultantStudentMessagesView(_ConsultantProfileViewBase):
    def get(self, request, user_id: int):
        messages = get_container().message_service.list_thread(
            user_id, context=build_context(request),
        )
        return Response([direct_message_to_dict(message) for message in messages])

    def post(self, request, user_id: int):
        serializer = DirectMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = get_container().message_service.send_as_consultant(
            SendDirectMessageCommand(
                student_id=user_id,
                body=serializer.validated_data['body'],
            ),
            context=build_context(request),
        )
        return Response(direct_message_to_dict(message), status=status.HTTP_201_CREATED)


class StudentDirectMessageListCreateView(BasePlanningView):
    """اینباکس دانش‌آموز برای پیام‌های مشاور (پاسخ و مشاهده)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        messages = get_container().message_service.list_for_student(
            context=build_context(request),
        )
        return Response([direct_message_to_dict(message) for message in messages])

    def post(self, request):
        serializer = StudentReplyMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        message = get_container().message_service.send_as_student(
            consultant_id=data['consultant_id'],
            body=data['body'],
            context=build_context(request),
        )
        return Response(direct_message_to_dict(message), status=status.HTTP_201_CREATED)


class StudentSchoolConsultantsView(BasePlanningView):
    """فهرست مشاوران مدرسه‌ی دانش‌آموز برای شروع/ادامه گفت‌وگو."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        consultants = get_container().message_service.list_school_consultants(
            context=build_context(request),
        )
        return Response([
            {
                'user_id': item.user_id,
                'full_name': item.full_name,
                'phone_number': item.phone_number,
            }
            for item in consultants
        ])
