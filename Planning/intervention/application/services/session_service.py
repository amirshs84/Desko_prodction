"""جلسات مشاوره‌ی مشاور با دانش‌آموزان مدرسه‌ی خودش."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import Callable
from zoneinfo import ZoneInfo

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ...domain.entities.counseling_session import CounselingSession
from ...domain.repositories.counseling_session_repository import CounselingSessionRepository
from ..commands.session_commands import CreateSessionCommand, UpdateSessionCommand
from ..dto.session_dto import CounselingSessionDTO

TEHRAN = ZoneInfo('Asia/Tehran')


class SessionService:
    def __init__(
        self,
        *,
        sessions: CounselingSessionRepository,
        directory: SchoolDirectory,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._sessions = sessions
        self._directory = directory
        self._uow_factory = uow_factory

    def list_sessions(
        self,
        *,
        context: RequestContext,
        on: date | None = None,
        student_id: int | None = None,
    ) -> list[CounselingSessionDTO]:
        school_id = _require_consultant(context)
        if student_id is not None:
            self._assert_school_student(school_id, student_id)
        if on is None and student_id is None:
            on = datetime.now(TEHRAN).date()
        if on is not None:
            start, end = _day_bounds(on)
            rows = self._sessions.list_between(
                consultant_id=context.actor_user_id,
                start=start,
                end=end,
                student_id=student_id,
            )
        else:
            rows = self._sessions.list_for_student(
                consultant_id=context.actor_user_id,
                student_id=student_id,
            )
        return self._with_names(school_id, rows)

    def create_session(
        self, command: CreateSessionCommand, *, context: RequestContext,
    ) -> CounselingSessionDTO:
        school_id = _require_consultant(context)
        self._assert_school_student(school_id, command.student_id)
        session = CounselingSession.create(
            school_id=school_id,
            consultant_id=context.actor_user_id,
            student_id=command.student_id,
            title=command.title,
            starts_at=command.starts_at,
        )
        with self._uow_factory():
            session = self._sessions.add(session)
        return self._one(school_id, session)

    def update_session(
        self, command: UpdateSessionCommand, *, context: RequestContext,
    ) -> CounselingSessionDTO:
        school_id = _require_consultant(context)
        session = self._sessions.get(
            command.session_id, consultant_id=context.actor_user_id,
        )
        if command.title is not None:
            session.retitle(command.title)
        if command.starts_at is not None:
            session.reschedule(command.starts_at)
        if command.status is not None:
            session.change_status(command.status)
        with self._uow_factory():
            self._sessions.save(session)
        refreshed = self._sessions.get(
            command.session_id, consultant_id=context.actor_user_id,
        )
        return self._one(school_id, refreshed)

    def delete_session(self, session_id: int, *, context: RequestContext) -> None:
        _require_consultant(context)
        with self._uow_factory():
            self._sessions.delete(session_id, consultant_id=context.actor_user_id)

    def _one(self, school_id: int, session: CounselingSession) -> CounselingSessionDTO:
        return self._with_names(school_id, [session])[0]

    def _with_names(
        self, school_id: int, sessions: list[CounselingSession],
    ) -> list[CounselingSessionDTO]:
        found = self._directory.list_students_by_ids(
            school_id, [session.student_id for session in sessions],
        )
        names = {student.user_id: student.full_name for student in found}
        return [
            CounselingSessionDTO.from_entity(
                session, student_name=names.get(session.student_id, ''),
            )
            for session in sessions
        ]

    def _assert_school_student(self, school_id: int, student_id: int) -> None:
        found = self._directory.list_students_by_ids(school_id, [student_id])
        if not found:
            raise ValidationError(
                'این کاربر دانش‌آموز فعال مدرسه‌ی شما نیست.',
                meta={'student_id': student_id},
            )


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=TEHRAN)
    return start, start + timedelta(days=1)


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('جلسه‌ی مشاوره فقط در اختیار مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
