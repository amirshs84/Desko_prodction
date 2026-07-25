"""Command های مدیریت گروه‌های دانش‌آموزی."""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.application.cqrs import Command
from ....shared.domain.errors import ValidationError


@dataclass(frozen=True)
class CreateGroupCommand(Command):
    name: str
    description: str = ''
    member_ids: tuple[int, ...] = ()


@dataclass(frozen=True)
class UpdateGroupCommand(Command):
    group_id: int
    name: str | None = None
    description: str | None = None

    def __post_init__(self) -> None:
        if self.name is None and self.description is None:
            raise ValidationError('هیچ تغییری برای اعمال ارسال نشده است.')


@dataclass(frozen=True)
class ChangeMembersCommand(Command):
    """افزودن/حذف عضو، یا جایگزینی کامل فهرست اعضا.

    ``replace_ids`` با دو تای دیگر جمع نمی‌شود: یا فهرست نهایی را می‌فرستی
    (رفتار مناسب انتخاب گروهی در UI) یا تفاضلی کار می‌کنی.
    """

    group_id: int
    add_ids: tuple[int, ...] = ()
    remove_ids: tuple[int, ...] = ()
    replace_ids: tuple[int, ...] | None = None

    def __post_init__(self) -> None:
        if self.replace_ids is not None and (self.add_ids or self.remove_ids):
            raise ValidationError(
                'جایگزینی کامل اعضا را نمی‌توان با افزودن/حذف ترکیب کرد.'
            )
        if self.replace_ids is None and not self.add_ids and not self.remove_ids:
            raise ValidationError('هیچ تغییری در اعضا ارسال نشده است.')
        overlap = set(self.add_ids) & set(self.remove_ids)
        if overlap:
            raise ValidationError(
                'یک دانش‌آموز نمی‌تواند هم‌زمان اضافه و حذف شود.',
                meta={'user_ids': sorted(overlap)},
            )
