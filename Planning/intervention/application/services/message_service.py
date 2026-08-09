"""پیام مستقیم مشاور ↔ دانش‌آموز."""
from __future__ import annotations

from typing import Callable

from ....shared.application.context import RequestContext
from ....shared.application.ports.school_directory import ConsultantInfo, SchoolDirectory
from ....shared.application.ports.unit_of_work import UnitOfWork
from ....shared.domain.enums import WriteAuthority
from ....shared.domain.errors import PermissionDeniedError, ValidationError
from ...domain.entities.direct_message import DirectMessage, MessageSender
from ...domain.repositories.direct_message_repository import DirectMessageRepository
from ..commands.message_commands import SendDirectMessageCommand
from ..dto.message_dto import DirectMessageDTO


class MessageService:
    def __init__(
        self,
        *,
        messages: DirectMessageRepository,
        directory: SchoolDirectory,
        uow_factory: Callable[[], UnitOfWork],
    ) -> None:
        self._messages = messages
        self._directory = directory
        self._uow_factory = uow_factory

    def list_thread(
        self, student_id: int, *, context: RequestContext,
    ) -> list[DirectMessageDTO]:
        school_id = _require_consultant(context)
        self._assert_school_student(school_id, student_id)
        thread = self._messages.list_thread(
            consultant_id=context.actor_user_id, student_id=student_id,
        )
        return [DirectMessageDTO.from_entity(message) for message in thread]

    def send_as_consultant(
        self, command: SendDirectMessageCommand, *, context: RequestContext,
    ) -> DirectMessageDTO:
        school_id = _require_consultant(context)
        self._assert_school_student(school_id, command.student_id)
        message = DirectMessage.create(
            school_id=school_id,
            consultant_id=context.actor_user_id,
            student_id=command.student_id,
            sender_role=MessageSender.CONSULTANT,
            body=command.body,
        )
        with self._uow_factory():
            message = self._messages.add(message)
        return DirectMessageDTO.from_entity(message)

    def list_school_consultants(self, *, context: RequestContext) -> list[ConsultantInfo]:
        if context.authority is not WriteAuthority.STUDENT:
            raise PermissionDeniedError('فقط دانش‌آموز می‌تواند فهرست مشاوران را ببیند.')
        if context.school_id is None:
            raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
        return self._directory.list_consultants(context.school_id)

    def list_for_student(self, *, context: RequestContext) -> list[DirectMessageDTO]:
        if context.authority is not WriteAuthority.STUDENT:
            raise PermissionDeniedError('فقط دانش‌آموز می‌تواند اینباکس خود را ببیند.')
        thread = self._messages.list_for_student(student_id=context.actor_user_id)
        return [DirectMessageDTO.from_entity(message) for message in thread]

    def send_as_student(
        self, *, consultant_id: int, body: str, context: RequestContext,
    ) -> DirectMessageDTO:
        if context.authority is not WriteAuthority.STUDENT:
            raise PermissionDeniedError('فقط دانش‌آموز می‌تواند پیام بفرستد.')
        if context.school_id is None:
            raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')

        consultant = self._directory.get_consultant(
            consultant_id, school_id=context.school_id,
        )
        if consultant is None:
            raise ValidationError(
                'این مشاور در مدرسه‌ی شما یافت نشد.',
                meta={'consultant_id': consultant_id},
            )

        message = DirectMessage.create(
            school_id=context.school_id,
            consultant_id=consultant_id,
            student_id=context.actor_user_id,
            sender_role=MessageSender.STUDENT,
            body=body,
        )
        with self._uow_factory():
            message = self._messages.add(message)
        return DirectMessageDTO.from_entity(message)

    def _assert_school_student(self, school_id: int, student_id: int) -> None:
        found = self._directory.list_students_by_ids(school_id, [student_id])
        if not found:
            raise ValidationError(
                'این کاربر دانش‌آموز فعال مدرسه‌ی شما نیست.',
                meta={'student_id': student_id},
            )


def _require_consultant(context: RequestContext) -> int:
    if context.authority is not WriteAuthority.CONSULTANT:
        raise PermissionDeniedError('پیام مشاور فقط در اختیار مشاور است.')
    if context.school_id is None:
        raise PermissionDeniedError('حساب شما به هیچ مدرسه‌ای متصل نیست.')
    return context.school_id
