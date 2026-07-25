"""اندپوینت‌های برنامه‌ریزی گروهی مشاور و اینباکس پیشنهاد دانش‌آموز.

پیش‌نمایش هیچ چیزی در دیتابیس نمی‌نویسد؛ انتشار یا مستقیم روی تقویم می‌نشیند
(``forced``) یا فقط پیشنهاد می‌سازد (``suggested``). بازگردانی اسنپ‌شات جداست و
فقط رویدادهای قابل‌تغییر را عوض می‌کند؛ رویدادهای ثابت مدرسه دست‌نخورده می‌مانند.
"""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ....intervention.application.commands.plan_commands import (
    BuildPlanCommand,
    RespondToProposalCommand,
)
from ....intervention.domain.entities.plan_request import PlanRequest
from ....intervention.domain.enums import IntensityLevel, PlanMode
from ....intervention.domain.value_objects.plan_window import PlanWindow
from ....intervention.domain.value_objects.subject_quota import SubjectQuota
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError
from ..context import build_context, resolve_calendar_owner
from ..errors import BasePlanningView
from ..params import parse_jalali_date, parse_optional_int
from ..serializers import (
    PlanBuildSerializer,
    ProposalRespondSerializer,
    plan_preview_to_dict,
    plan_run_summary_to_dict,
    plan_run_to_dict,
    proposal_to_dict,
    snapshot_to_dict,
)


class _ConsultantPlanView(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]

    @property
    def planning(self):
        return get_container().batch_planning_service


class PlanPreviewView(_ConsultantPlanView):
    def post(self, request):
        command = _build_plan_command(request.data)
        dto = self.planning.preview(command, context=build_context(request))
        return Response(plan_preview_to_dict(dto))


class PlanPublishView(_ConsultantPlanView):
    def post(self, request):
        command = _build_plan_command(request.data)
        dto = self.planning.publish(command, context=build_context(request))
        return Response(plan_run_to_dict(dto), status=status.HTTP_201_CREATED)


class PlanRunListView(_ConsultantPlanView):
    def get(self, request):
        runs = self.planning.list_runs(context=build_context(request))
        return Response([plan_run_summary_to_dict(run) for run in runs])


class PlanRunDetailView(_ConsultantPlanView):
    def get(self, request, run_id):
        dto = self.planning.get_run(run_id, context=build_context(request))
        return Response(plan_run_to_dict(dto))


class StudentProposalListView(BasePlanningView):
    """اینباکس پیشنهادهای برنامه‌ی دانش‌آموز."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending_only = request.query_params.get('pending') == 'true'
        proposals = get_container().proposal_service.list_for_student(
            context=build_context(request), pending_only=pending_only,
        )
        return Response([proposal_to_dict(proposal) for proposal in proposals])


class StudentProposalRespondView(BasePlanningView):
    permission_classes = [IsAuthenticated]

    def post(self, request, proposal_id):
        serializer = ProposalRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = get_container().proposal_service.respond(
            RespondToProposalCommand(
                proposal_id=proposal_id, accept=serializer.validated_data['accept'],
            ),
            context=build_context(request),
        )
        return Response({
            'proposal_id': result.proposal_id,
            'accepted': result.accepted,
            'applied_blocks': result.applied_blocks,
            'skipped_blocks': result.skipped_blocks,
        })


class CalendarSnapshotListView(BasePlanningView):
    """فهرست نسخه‌های تقویم (خود دانش‌آموز یا مشاور با ``?user=``)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        _ensure_snapshot_access(request, owner_id)
        snapshots = get_container().snapshot_service.list_snapshots(owner_id)
        return Response([snapshot_to_dict(snapshot) for snapshot in snapshots])


class CalendarSnapshotRestoreView(BasePlanningView):
    permission_classes = [IsAuthenticated]

    def post(self, request, snapshot_id):
        owner_id = resolve_calendar_owner(request, parse_optional_int(request, 'user'))
        _ensure_snapshot_access(request, owner_id)
        snapshot, restored = get_container().snapshot_service.restore(
            snapshot_id, owner_id, context=build_context(request),
        )
        return Response({
            'snapshot': snapshot_to_dict(snapshot),
            'restored_events': restored,
        })


# ---------- سازنده‌ها ----------

def _build_plan_command(data) -> BuildPlanCommand:
    serializer = PlanBuildSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    attrs = serializer.validated_data

    window = PlanWindow(
        start=parse_jalali_date(attrs['start'], 'start'),
        end=parse_jalali_date(attrs['end'], 'end'),
    )
    if attrs.get('quotas'):
        request_vo = PlanRequest(
            window=window,
            quotas=tuple(
                SubjectQuota(subject=item['subject'], minutes=item['minutes'])
                for item in attrs['quotas']
            ),
            intensity=IntensityLevel(attrs['intensity']),
        )
    else:
        request_vo = PlanRequest(
            window=window,
            subjects=tuple(attrs['subjects']),
            total_minutes=attrs['total_minutes'],
            intensity=IntensityLevel(attrs['intensity']),
        )

    ratios = tuple(sorted((subject, float(weight)) for subject, weight in attrs['ratios'].items()))
    return BuildPlanCommand(
        request=request_vo,
        group_id=attrs.get('group_id'),
        student_ids=tuple(attrs.get('student_ids') or ()),
        ratios=ratios,
        mode=PlanMode(attrs['mode']),
        color=attrs['color'],
    )


def _ensure_snapshot_access(request, owner_id: int) -> None:
    """بازگردانی/فهرست نسخه برای مدیر مدرسه باز نیست؛ فقط دانش‌آموز و مشاور."""
    context = build_context(request)
    if context.authority is WriteAuthority.SCHOOL_MANAGER:
        raise PermissionDeniedError('مدیر مدرسه به نسخه‌های تقویم دسترسی ندارد.')
    if context.authority is WriteAuthority.STUDENT and owner_id != request.user.id:
        raise PermissionDeniedError('دانش‌آموز فقط نسخه‌های تقویم خودش را می‌بیند.')
