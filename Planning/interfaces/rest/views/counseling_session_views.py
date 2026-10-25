"""اندپوینت جلسات مشاوره‌ی مشاور."""
from __future__ import annotations

from datetime import date

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ....intervention.application.commands.session_commands import (
    CreateSessionCommand,
    UpdateSessionCommand,
)
from ....shared.domain.errors import ValidationError
from ..context import build_context
from ..errors import BasePlanningView
from ..serializers import (
    CounselingSessionCreateSerializer,
    CounselingSessionUpdateSerializer,
    session_to_dict,
)


class CounselingSessionListCreateView(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def get(self, request):
        on = _parse_on(request.query_params.get('on'))
        student_id = _parse_student(request.query_params.get('student'))
        sessions = get_container().session_service.list_sessions(
            context=build_context(request),
            on=on,
            student_id=student_id,
        )
        return Response([session_to_dict(session) for session in sessions])

    def post(self, request):
        serializer = CounselingSessionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        session = get_container().session_service.create_session(
            CreateSessionCommand(
                student_id=data['student_id'],
                title=data['title'],
                starts_at=data['starts_at'],
            ),
            context=build_context(request),
        )
        return Response(session_to_dict(session), status=status.HTTP_201_CREATED)


class CounselingSessionDetailView(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def patch(self, request, session_id: int):
        serializer = CounselingSessionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        session = get_container().session_service.update_session(
            UpdateSessionCommand(
                session_id=session_id,
                title=data.get('title'),
                starts_at=data.get('starts_at'),
                status=data.get('status'),
            ),
            context=build_context(request),
        )
        return Response(session_to_dict(session))

    def delete(self, request, session_id: int):
        get_container().session_service.delete_session(
            session_id, context=build_context(request),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


def _parse_on(raw) -> date | None:
    if raw in (None, ''):
        return None
    try:
        return date.fromisoformat(str(raw))
    except ValueError as exc:
        raise ValidationError('تاریخ جلسه باید به صورت YYYY-MM-DD باشد.') from exc


def _parse_student(raw) -> int | None:
    if raw in (None, ''):
        return None
    try:
        student_id = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError('شناسه‌ی دانش‌آموز نامعتبر است.') from exc
    if student_id < 1:
        raise ValidationError('شناسه‌ی دانش‌آموز نامعتبر است.')
    return student_id
