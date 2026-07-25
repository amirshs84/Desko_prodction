"""Composition Root — نقطه‌ی مرکزی Dependency Injection اپ Planning.

تنها جایی که پیاده‌سازی‌های concrete ساخته و به Service ها تزریق می‌شوند. لایه‌های
domain/application فقط به پورت‌ها وابسته‌اند و این فایل آن‌ها را به آداپتورهای
infrastructure «سیم‌کشی» می‌کند.

نکته: Repository ها و آداپتورها بدون state هستند و singleton می‌شوند؛ Unit of Work
اما per-operation ساخته می‌شود (مرز تراکنش)، پس به‌صورت factory تزریق می‌گردد.
"""
from __future__ import annotations

from functools import cached_property

from typing import Mapping

from .intervention.application.services import (
    BatchPlanningService,
    GroupService,
    ProposalService,
    RosterService,
)
from .intervention.domain.ports.subject_weight_calculator import SubjectWeightCalculator
from .intervention.infrastructure.persistence.repositories.plan_run_repository import (
    DjangoPlanProposalRepository,
    DjangoPlanRunRepository,
)
from .intervention.infrastructure.persistence.repositories.student_group_repository import (
    DjangoStudentGroupRepository,
)
from .intervention.infrastructure.policies import StaticBurnoutPolicy
from .intervention.infrastructure.weights import (
    EqualDistributionWeightCalculator,
    ManualRatioWeightCalculator,
)
from .reporting.application.services import ProgressService
from .reporting.infrastructure.django_study_report_reader import DjangoStudyReportReader
from .scheduling.application.services import (
    BlockPlacementService,
    CalendarService,
    ClassFixedEventService,
    SnapshotService,
)
from .scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from .scheduling.infrastructure.id_generator import Uuid4IdGenerator
from .scheduling.infrastructure.persistence.repositories.block_template_repository import (
    DjangoBlockTemplateRepository,
)
from .scheduling.infrastructure.persistence.repositories.calendar_event_repository import (
    DjangoCalendarEventRepository,
)
from .scheduling.infrastructure.persistence.repositories.snapshot_repository import (
    DjangoCalendarSnapshotRepository,
)
from .shared.infrastructure.django_school_directory import DjangoSchoolDirectory
from .shared.infrastructure.unit_of_work import DjangoUnitOfWork


class Container:
    # ---------- زیرساخت پایه (singleton) ----------

    @cached_property
    def ids(self) -> Uuid4IdGenerator:
        return Uuid4IdGenerator()

    @cached_property
    def school_directory(self) -> DjangoSchoolDirectory:
        return DjangoSchoolDirectory()

    @cached_property
    def study_report_reader(self) -> DjangoStudyReportReader:
        return DjangoStudyReportReader()

    @cached_property
    def awake_window_policy(self) -> AwakeWindowPolicy:
        """پنجره‌ی بیداری ۰۶:۰۰–۲۳:۰۰. وقتی شخصی‌سازی لازم شد، فقط همین‌جا عوض می‌شود."""
        return AwakeWindowPolicy.default()

    # ---------- Repository ها ----------

    @cached_property
    def calendar_events(self) -> DjangoCalendarEventRepository:
        return DjangoCalendarEventRepository()

    @cached_property
    def block_templates(self) -> DjangoBlockTemplateRepository:
        return DjangoBlockTemplateRepository()

    @cached_property
    def calendar_snapshots(self) -> DjangoCalendarSnapshotRepository:
        return DjangoCalendarSnapshotRepository()

    @cached_property
    def student_groups(self) -> DjangoStudentGroupRepository:
        return DjangoStudentGroupRepository()

    @cached_property
    def plan_runs(self) -> DjangoPlanRunRepository:
        return DjangoPlanRunRepository()

    @cached_property
    def plan_proposals(self) -> DjangoPlanProposalRepository:
        return DjangoPlanProposalRepository()

    # ---------- سیاست‌های قابل جایگزینی موتور ----------

    @cached_property
    def burnout_policy(self) -> StaticBurnoutPolicy:
        """سقف مطالعه‌ی هر درس. جای تزریق نسخه‌ی شخصی‌سازی‌شده در آینده همین‌جاست."""
        return StaticBurnoutPolicy()

    @staticmethod
    def weight_calculator(ratios: Mapping[str, float] | None) -> SubjectWeightCalculator:
        """وزن‌دهی درس‌ها: نسبت دستی مشاور، وگرنه توزیع یکنواخت.

        همین متد است که روزی به ماژول AI وصل می‌شود؛ موتور و سرویس‌ها تغییر نمی‌کنند.
        """
        if ratios:
            return ManualRatioWeightCalculator(ratios)
        return EqualDistributionWeightCalculator()

    # ---------- Unit of Work (factory، per-operation) ----------

    def unit_of_work(self) -> DjangoUnitOfWork:
        return DjangoUnitOfWork()

    # ---------- Service ها ----------

    @cached_property
    def calendar_service(self) -> CalendarService:
        return CalendarService(
            events=self.calendar_events,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def block_placement_service(self) -> BlockPlacementService:
        return BlockPlacementService(
            events=self.calendar_events,
            ids=self.ids,
            uow_factory=self.unit_of_work,
            templates=self.block_templates,
            policy=self.awake_window_policy,
        )

    @cached_property
    def class_fixed_event_service(self) -> ClassFixedEventService:
        return ClassFixedEventService(
            events=self.calendar_events,
            directory=self.school_directory,
            ids=self.ids,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def group_service(self) -> GroupService:
        return GroupService(
            groups=self.student_groups,
            directory=self.school_directory,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def roster_service(self) -> RosterService:
        return RosterService(
            groups=self.student_groups,
            directory=self.school_directory,
        )

    @cached_property
    def snapshot_service(self) -> SnapshotService:
        return SnapshotService(
            events=self.calendar_events,
            snapshots=self.calendar_snapshots,
            uow_factory=self.unit_of_work,
        )

    @cached_property
    def batch_planning_service(self) -> BatchPlanningService:
        return BatchPlanningService(
            groups=self.student_groups,
            runs=self.plan_runs,
            events=self.calendar_events,
            snapshots=self.snapshot_service,
            directory=self.school_directory,
            weight_calculator_factory=self.weight_calculator,
            burnout=self.burnout_policy,
            ids=self.ids,
            uow_factory=self.unit_of_work,
            awake_window=self.awake_window_policy,
        )

    @cached_property
    def proposal_service(self) -> ProposalService:
        return ProposalService(
            proposals=self.plan_proposals,
            events=self.calendar_events,
            snapshots=self.snapshot_service,
            ids=self.ids,
            uow_factory=self.unit_of_work,
            awake_window=self.awake_window_policy,
        )

    @cached_property
    def progress_service(self) -> ProgressService:
        return ProgressService(
            reports=self.study_report_reader,
            directory=self.school_directory,
        )


_container: Container | None = None


def get_container() -> Container:
    """دسترسی singleton به Container (lazy)."""
    global _container
    if _container is None:
        _container = Container()
    return _container
