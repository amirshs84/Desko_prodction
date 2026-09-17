"""Command های برنامه‌ریزی گروهی."""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.application.cqrs import Command
from ....shared.domain.errors import ValidationError
from ...domain.entities.plan_request import PlanRequest
from ...domain.enums import PlanMode

MAX_STUDENTS_PER_RUN = 200


@dataclass(frozen=True)
class BuildPlanCommand(Command):
    """ورودی مشترک پیش‌نمایش و انتشار.

    مخاطبان یا با ``group_id`` مشخص می‌شوند یا با فهرست صریح ``student_ids``؛ در
    هر دو حالت، سرویس عضویت مدرسه را دوباره اعتبارسنجی می‌کند.
    """

    request: PlanRequest
    group_id: int | None = None
    student_ids: tuple[int, ...] = ()
    ratios: tuple[tuple[str, float], ...] = ()
    mode: PlanMode = PlanMode.SUGGESTED
    color: str = ''
    goal_message: str = ''

    def __post_init__(self) -> None:
        if self.group_id is None and not self.student_ids:
            raise ValidationError('گروه یا فهرست دانش‌آموزان را مشخص کنید.')
        if self.group_id is not None and self.student_ids:
            raise ValidationError('هم‌زمان گروه و فهرست دستی نفرستید.')
        if len(self.student_ids) > MAX_STUDENTS_PER_RUN:
            raise ValidationError(
                f'در هر اجرا حداکثر {MAX_STUDENTS_PER_RUN} دانش‌آموز مجاز است.',
            )


@dataclass(frozen=True)
class RespondToProposalCommand(Command):
    proposal_id: int
    accept: bool
    reason: str = ''


@dataclass(frozen=True)
class RespondToProposalBlockCommand(Command):
    proposal_id: int
    block_index: int
    accept: bool
    reason: str = ''
