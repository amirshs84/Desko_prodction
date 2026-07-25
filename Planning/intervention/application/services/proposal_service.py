"""پاسخ دانش‌آموز به برنامه‌ی پیشنهادی.

نکته‌ی مهم: بین «ارسال پیشنهاد» و «پذیرش» ممکن است روزها فاصله باشد و تقویم عوض
شده باشد. بنابراین در لحظه‌ی پذیرش، هر بلوک دوباره اعتبارسنجی می‌شود: اگر جای
اصلی‌اش آزاد است همان‌جا می‌نشیند، اگر پر شده به نزدیک‌ترین فضای خالی همان روز snap
می‌شود، و اگر آن روز جا نداشت آن بلوک کنار گذاشته می‌شود و تعدادش گزارش می‌گردد.
هیچ رویداد موجودی بازنویسی نمی‌شود.
"""
from __future__ import annotations

from typing import Callable

from ....scheduling.application.ports.id_generator import IdGenerator
from ....scheduling.application.services.snapshot_service import SnapshotService
from ....scheduling.domain.entities.calendar_event import DEFAULT_EVENT_COLOR, CalendarEvent
from ....scheduling.domain.entities.calendar_snapshot import SnapshotReason
from ....scheduling.domain.entities.day_agenda import DayAgenda
from ....scheduling.domain.enums import EventKind
from ....scheduling.domain.repositories.calendar_event_repository import (
    CalendarEventRepository,
)
from ....scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from ....scheduling.domain.value_objects.event_ref import EventRef
from ....scheduling.domain.value_objects.jalali_date import JalaliDate
from ....shared.application.context import RequestContext
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import DailyCapacityFullError, PermissionDeniedError
from ...domain.entities.plan_run import PlanProposal
from ...domain.repositories.plan_run_repository import PlanProposalRepository
from ..commands.plan_commands import RespondToProposalCommand
from ..dto.plan_dto import ProposalResponseDTO


class ProposalService:
    def __init__(
        self,
        *,
        proposals: PlanProposalRepository,
        events: CalendarEventRepository,
        snapshots: SnapshotService,
        ids: IdGenerator,
        uow_factory: Callable[[], UnitOfWork],
        awake_window: AwakeWindowPolicy | None = None,
    ) -> None:
        self._proposals = proposals
        self._events = events
        self._snapshots = snapshots
        self._ids = ids
        self._uow_factory = uow_factory
        self._awake = awake_window or AwakeWindowPolicy.default()

    def list_for_student(
        self, *, context: RequestContext, pending_only: bool = False,
    ) -> list[PlanProposal]:
        _require_student(context)
        return self._proposals.list_for_student(
            context.actor_user_id, pending_only=pending_only,
        )

    def respond(
        self, command: RespondToProposalCommand, *, context: RequestContext,
    ) -> ProposalResponseDTO:
        student_id = _require_student(context)
        proposal = self._proposals.get_for_student(
            command.proposal_id, student_id=student_id,
        )
        proposal.ensure_pending()

        if not command.accept:
            with self._uow_factory():
                proposal.reject()
                self._proposals.save(proposal)
            return ProposalResponseDTO(
                proposal_id=proposal.id, accepted=False, applied_blocks=0, skipped_blocks=0,
            )

        with self._uow_factory():
            self._snapshots.capture(
                student_id,
                reason=SnapshotReason.PROPOSAL_ACCEPT,
                plan_run_id=proposal.group_tag,
            )
            placed, skipped = self._apply_blocks(student_id, proposal)
            proposal.accept(applied_blocks=len(placed))
            self._proposals.save(proposal)
            self._events.add_many(placed)

        return ProposalResponseDTO(
            proposal_id=proposal.id,
            accepted=True,
            applied_blocks=len(placed),
            skipped_blocks=skipped,
        )

    # ---------- کمکی ----------

    def _apply_blocks(
        self, student_id: int, proposal: PlanProposal,
    ) -> tuple[list[CalendarEvent], int]:
        dates = {block.date for block in proposal.blocks}
        if not dates:
            return [], 0

        existing = self._events.list_for_owner(
            student_id, date_from=min(dates), date_to=max(dates),
        )
        by_date: dict[JalaliDate, list[CalendarEvent]] = {date: [] for date in dates}
        for event in existing:
            by_date.setdefault(event.date, []).append(event)

        placed: list[CalendarEvent] = []
        skipped = 0
        for block in proposal.blocks:
            agenda = DayAgenda.build(
                student_id, block.date, by_date.get(block.date, []), policy=self._awake,
            )
            try:
                slot = agenda.find_slot(
                    block.minutes, preferred_start=block.slot.start_minutes,
                )
            except DailyCapacityFullError:
                skipped += 1
                continue
            event = CalendarEvent.create(
                ref=EventRef(owner_id=student_id, client_id=self._ids.new_id()),
                date=block.date,
                slot=slot,
                title=block.subject,
                color=block.color or DEFAULT_EVENT_COLOR,
                group_id=proposal.group_tag,
                kind=EventKind.MUTABLE,
                authority=WriteAuthority.ALGORITHM,
            )
            placed.append(event)
            # بلوک تازه بلافاصله جزو اشغال روز می‌شود تا بلوک بعدی رویش ننشیند.
            by_date.setdefault(block.date, []).append(event)
        return placed, skipped


def _require_student(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.STUDENT:
        raise PermissionDeniedError('پاسخ به برنامه‌ی پیشنهادی فقط با خود دانش‌آموز است.')
    return context.actor_user_id
