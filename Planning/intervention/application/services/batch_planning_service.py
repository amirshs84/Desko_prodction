"""Use-case های برنامه‌ریزی گروهی: پیش‌نمایش و انتشار.

تقسیم مسئولیت‌ها اینجا عمدی است:
  • موتور (دامنه) تصمیم می‌گیرد «چه بلوکی کجا بنشیند» و هیچ چیز درباره‌ی دیتابیس
    نمی‌داند.
  • این سرویس داده‌ها را جمع می‌کند، دسترسی را چک می‌کند، و نتیجه‌ی موتور را — فقط
    در حالت انتشار — به رویداد تقویم و رکورد اجرا تبدیل می‌کند.

پیش‌نمایش هیچ اثری روی دیتابیس ندارد؛ دقیقاً همان چیزی که سند خواسته بود.
"""
from __future__ import annotations

from typing import Callable, Mapping, Sequence

from ....scheduling.application.services.snapshot_service import SnapshotService
from ....scheduling.domain.entities.calendar_event import CalendarEvent
from ....scheduling.domain.entities.calendar_snapshot import SnapshotReason
from ....scheduling.domain.enums import EventKind
from ....scheduling.domain.repositories.calendar_event_repository import (
    CalendarEventRepository,
)
from ....scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from ....scheduling.domain.value_objects.event_ref import EventRef
from ....scheduling.application.ports.id_generator import IdGenerator
from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory, StudentInfo
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ...domain.entities.plan_draft import PlanPreview, StudentPlanDraft
from ...domain.entities.plan_run import PlanProposal, PlanRun
from ...domain.enums import PlanMode, ProposalStatus
from ...domain.ports.burnout_policy import BurnoutPolicy
from ...domain.ports.subject_weight_calculator import SubjectWeightCalculator
from ...domain.repositories.plan_run_repository import PlanRunRepository
from ...domain.repositories.student_group_repository import StudentGroupRepository
from ...domain.services.planning_engine import PlanningEngine
from ...domain.value_objects.planned_block import PlannedBlock
from ..commands.plan_commands import BuildPlanCommand
from ..dto.plan_dto import PlanPreviewDTO, PlanRunDTO

#: سازنده‌ی وزن‌دهنده؛ نسبت‌های دستی هر درخواست به آن داده می‌شود (خالی = یکنواخت).
WeightCalculatorFactory = Callable[[Mapping[str, float] | None], SubjectWeightCalculator]


class BatchPlanningService:
    def __init__(
        self,
        *,
        groups: StudentGroupRepository,
        runs: PlanRunRepository,
        events: CalendarEventRepository,
        snapshots: SnapshotService,
        directory: SchoolDirectory,
        weight_calculator_factory: WeightCalculatorFactory,
        burnout: BurnoutPolicy,
        ids: IdGenerator,
        uow_factory: Callable[[], UnitOfWork],
        awake_window: AwakeWindowPolicy | None = None,
    ) -> None:
        self._groups = groups
        self._runs = runs
        self._events = events
        self._snapshots = snapshots
        self._directory = directory
        self._weights = weight_calculator_factory
        self._burnout = burnout
        self._ids = ids
        self._uow_factory = uow_factory
        self._awake = awake_window or AwakeWindowPolicy.default()

    # ---------- پیش‌نمایش ----------

    def preview(self, command: BuildPlanCommand, *, context: RequestContext) -> PlanPreviewDTO:
        students = self._resolve_students(command, context)
        preview = self._run_engine(command, students)
        return PlanPreviewDTO(
            preview=preview,
            students={student.user_id: student for student in students},
        )

    # ---------- انتشار ----------

    def publish(self, command: BuildPlanCommand, *, context: RequestContext) -> PlanRunDTO:
        students = self._resolve_students(command, context)
        # موتور دوباره روی داده‌ی تازه اجرا می‌شود؛ پیش‌نمایشی که مشاور دیده ممکن
        # است چند دقیقه قدیمی باشد و در این فاصله تقویم عوض شده باشد.
        preview = self._run_engine(command, students)
        group_tag = f'plan-{self._ids.new_id()}'
        # اگر مشاور رنگ اجباری نفرستاده، هر بلوک رنگ خودش را از موتور می‌گیرد.
        color_override = command.color or None

        created_events = 0
        snapshots_taken = 0
        proposals: list[PlanProposal] = []

        with self._uow_factory():
            for draft in preview.drafts:
                if command.mode is PlanMode.FORCED:
                    self._snapshots.capture(
                        draft.student_id,
                        reason=SnapshotReason.PLAN_PUBLISH,
                        plan_run_id=group_tag,
                    )
                    snapshots_taken += 1
                    created_events += self._events.add_many(
                        self._to_events(
                            draft.student_id, draft.blocks, group_tag, color_override,
                        )
                    )
                proposals.append(
                    PlanProposal(
                        student_id=draft.student_id,
                        group_tag=group_tag,
                        blocks=draft.blocks,
                        status=(
                            ProposalStatus.ACCEPTED if command.mode is PlanMode.FORCED
                            else ProposalStatus.PENDING
                        ),
                        shortfall_minutes=draft.shortfall_minutes,
                        applied_blocks=(
                            len(draft.blocks) if command.mode is PlanMode.FORCED else 0
                        ),
                    )
                )

            run = self._runs.add(
                PlanRun(
                    consultant_id=context.actor_user_id,
                    school_id=context.school_id,
                    group_id=command.group_id,
                    mode=command.mode,
                    intensity=command.request.intensity,
                    group_tag=group_tag,
                    window=command.request.window,
                    summary=_summarize(preview),
                    proposals=tuple(proposals),
                )
            )

        return PlanRunDTO(
            run=run,
            students={student.user_id: student for student in students},
            created_events=created_events,
            snapshots_taken=snapshots_taken,
        )

    def apply_student_blocks(
        self,
        *,
        student_id: int,
        blocks: Sequence[PlannedBlock],
        context: RequestContext,
        take_snapshot: bool = True,
    ) -> dict:
        """ثبت دستی بلوک‌های ویرایش‌شده‌ی پیش‌نمایش روی تقویم یک دانش‌آموز.

        برای خروج فرد از بچ برنامه‌ریزی گروهی پس از ویرایش شخصی استفاده می‌شود.
        """
        school_id = _require_consultant(context)
        found = self._directory.list_students_by_ids(school_id, [student_id])
        if not found:
            raise ValidationError(
                'این کاربر دانش‌آموز فعال مدرسه‌ی شما نیست.',
                meta={'student_id': student_id},
            )
        if not blocks:
            raise ValidationError('هیچ بلوکی برای ثبت ارسال نشده است.')

        group_tag = f'plan-manual-{self._ids.new_id()}'
        created = 0
        with self._uow_factory():
            if take_snapshot:
                self._snapshots.capture(
                    student_id,
                    reason=SnapshotReason.PLAN_PUBLISH,
                    plan_run_id=group_tag,
                )
            created = self._events.add_many(
                self._to_events(student_id, blocks, group_tag, None),
            )
        return {
            'student_id': student_id,
            'created_events': created,
            'group_tag': group_tag,
        }

    # ---------- خواندن تاریخچه ----------

    def list_runs(self, *, context: RequestContext, limit: int = 50) -> list[PlanRun]:
        _require_consultant(context)
        return self._runs.list_for_consultant(context.actor_user_id, limit=limit)

    def get_run(self, run_id: int, *, context: RequestContext) -> PlanRunDTO:
        _require_consultant(context)
        run = self._runs.get(run_id, consultant_id=context.actor_user_id)
        students = self._directory.list_students_by_ids(
            context.school_id, [proposal.student_id for proposal in run.proposals],
        )
        return PlanRunDTO(run=run, students={s.user_id: s for s in students})

    # ---------- کمکی‌ها ----------

    def _resolve_students(
        self, command: BuildPlanCommand, context: RequestContext,
    ) -> list[StudentInfo]:
        school_id = _require_consultant(context)
        if command.group_id is not None:
            group = self._groups.get(command.group_id, consultant_id=context.actor_user_id)
            wanted = sorted(group.member_ids)
        else:
            wanted = sorted(set(command.student_ids))
        if not wanted:
            raise ValidationError('این گروه هیچ عضوی ندارد.')

        students = self._directory.list_students_by_ids(school_id, wanted)
        missing = sorted(set(wanted) - {student.user_id for student in students})
        if missing:
            raise ValidationError(
                'برخی از دانش‌آموزان انتخاب‌شده در این مدرسه فعال نیستند.',
                meta={'invalid_user_ids': missing},
            )
        return students

    def _run_engine(
        self, command: BuildPlanCommand, students: Sequence[StudentInfo],
    ) -> PlanPreview:
        window = command.request.window
        student_ids = [student.user_id for student in students]
        events = self._events.list_by_owners(
            student_ids, date_from=window.start, date_to=window.end,
        )
        by_owner: dict[int, list[CalendarEvent]] = {sid: [] for sid in student_ids}
        for event in events:
            by_owner[event.owner_id].append(event)

        engine = PlanningEngine(
            weights=self._weights(dict(command.ratios) if command.ratios else None),
            burnout=self._burnout,
            awake_window=self._awake,
        )
        return engine.plan(command.request, existing_events=by_owner)

    def _to_events(
        self,
        student_id: int,
        blocks: Sequence[PlannedBlock],
        group_tag: str,
        color: str | None,
    ) -> list[CalendarEvent]:
        # منشأ رویدادها «الگوریتم» است نه مشاور: در گزارش‌ها باید بتوان تفکیک کرد
        # که کدام بلوک را موتور گذاشته و کدام را انسان.
        return [
            CalendarEvent.create(
                ref=EventRef(owner_id=student_id, client_id=self._ids.new_id()),
                date=block.date,
                slot=block.slot,
                title=block.subject,
                color=color or block.color,
                group_id=group_tag,
                kind=EventKind.MUTABLE,
                authority=WriteAuthority.ALGORITHM,
            )
            for block in blocks
        ]


def _summarize(preview: PlanPreview) -> dict:
    return {
        'students': len(preview.drafts),
        'blocks': preview.total_blocks,
        'allocated_minutes': sum(draft.allocated_minutes for draft in preview.drafts),
        'required_minutes': sum(draft.required_minutes for draft in preview.drafts),
        'students_with_shortfall': len(preview.blocked_students),
    }


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('برنامه‌ریزی گروهی فقط در اختیار مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id


__all__ = ['BatchPlanningService', 'StudentPlanDraft']
