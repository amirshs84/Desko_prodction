"""یادداشت‌های خصوصی مشاور درباره دانش‌آموز — فقط برای همان مشاور."""
from __future__ import annotations

from typing import Callable

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import SchoolDirectory
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ...domain.entities.consultant_note import ConsultantNote
from ...domain.repositories.consultant_note_repository import ConsultantNoteRepository
from ..commands.note_commands import CreateNoteCommand, UpdateNoteCommand
from ..dto.note_dto import ConsultantNoteDTO


class NoteService:
    def __init__(
        self,
        *,
        notes: ConsultantNoteRepository,
        directory: SchoolDirectory,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._notes = notes
        self._directory = directory
        self._uow_factory = uow_factory

    def list_for_student(
        self, student_id: int, *, context: RequestContext,
    ) -> list[ConsultantNoteDTO]:
        school_id = _require_consultant(context)
        self._assert_school_student(school_id, student_id)
        notes = self._notes.list_for_student(
            consultant_id=context.actor_user_id, student_id=student_id,
        )
        return [ConsultantNoteDTO.from_entity(note) for note in notes]

    def create_note(
        self, command: CreateNoteCommand, *, context: RequestContext,
    ) -> ConsultantNoteDTO:
        school_id = _require_consultant(context)
        self._assert_school_student(school_id, command.student_id)
        note = ConsultantNote.create(
            school_id=school_id,
            consultant_id=context.actor_user_id,
            student_id=command.student_id,
            body=command.body,
        )
        with self._uow_factory():
            note = self._notes.add(note)
        return ConsultantNoteDTO.from_entity(note)

    def update_note(
        self, command: UpdateNoteCommand, *, context: RequestContext,
    ) -> ConsultantNoteDTO:
        _require_consultant(context)
        note = self._notes.get(command.note_id, consultant_id=context.actor_user_id)
        note.rewrite(command.body)
        with self._uow_factory():
            self._notes.save(note)
        # updated_at در ORM عوض می‌شود؛ برای پاسخ تازه می‌خوانیم.
        refreshed = self._notes.get(command.note_id, consultant_id=context.actor_user_id)
        return ConsultantNoteDTO.from_entity(refreshed)

    def delete_note(self, note_id: int, *, context: RequestContext) -> None:
        _require_consultant(context)
        with self._uow_factory():
            self._notes.delete(note_id, consultant_id=context.actor_user_id)

    def _assert_school_student(self, school_id: int, student_id: int) -> None:
        found = self._directory.list_students_by_ids(school_id, [student_id])
        if not found:
            raise ValidationError(
                'این کاربر دانش‌آموز فعال مدرسه‌ی شما نیست.',
                meta={'student_id': student_id},
            )


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('یادداشت خصوصی فقط در اختیار مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
