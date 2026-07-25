"""StudentGroup — واحد کاری مشاور برای برنامه‌ریزی گروهی.

مشاور دانش‌آموزان را به میل خودش دسته‌بندی می‌کند (مثلاً «کنکوری‌های ریاضی»،
«ضعیف در فیزیک») و بعد برنامه‌ی گروهی را روی یک گروه اجرا می‌کند. یک دانش‌آموز
می‌تواند در چند گروه باشد؛ عضویت اینجا یک مجموعه‌ی ساده از شناسه‌های کاربری است،
نه یک رابطه‌ی انحصاری.

مالکیت: هر گروه به یک مشاور تعلق دارد و مشاوران دیگر همان مدرسه آن را نمی‌بینند.
تعلق به مدرسه هم صریح ذخیره می‌شود تا اگر مشاور جابه‌جا شد، گروه در مدرسه‌ی خودش
بماند.

نکته: تا پیش از ذخیره، ``id`` مقدار ``None`` دارد؛ پس دو گروه ذخیره‌نشده از نظر
برابری هویتی یکسان شمرده می‌شوند. این تنها در مجموعه‌سازی از گروه‌های تازه اهمیت
دارد که در هیچ use-case ای رخ نمی‌دهد.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable

from ....shared.domain.entity import Entity
from ....shared.domain.errors import ValidationError

MAX_NAME_LENGTH = 100
MAX_MEMBERS = 300


@dataclass(eq=False)
class StudentGroup(Entity):
    id: int | None
    school_id: int
    consultant_id: int
    name: str
    description: str = ''
    member_ids: set[int] = field(default_factory=set)
    created_at: datetime | None = None

    @classmethod
    def create(
        cls,
        *,
        school_id: int,
        consultant_id: int,
        name: str,
        description: str = '',
        member_ids: Iterable[int] = (),
    ) -> 'StudentGroup':
        group = cls(
            id=None,
            school_id=school_id,
            consultant_id=consultant_id,
            name=_clean_name(name),
            description=description or '',
        )
        group.replace_members(member_ids)
        return group

    # ---------- ویژگی‌ها ----------

    @property
    def member_count(self) -> int:
        return len(self.member_ids)

    def belongs_to(self, consultant_id: int) -> bool:
        return self.consultant_id == consultant_id

    def has_member(self, student_id: int) -> bool:
        return student_id in self.member_ids

    # ---------- تغییر ----------

    def rename(self, name: str) -> None:
        self.name = _clean_name(name)

    def describe(self, description: str) -> None:
        self.description = description or ''

    def add_members(self, student_ids: Iterable[int]) -> None:
        self._apply_members(self.member_ids | _as_id_set(student_ids))

    def remove_members(self, student_ids: Iterable[int]) -> None:
        self._apply_members(self.member_ids - _as_id_set(student_ids))

    def replace_members(self, student_ids: Iterable[int]) -> None:
        self._apply_members(_as_id_set(student_ids))

    def _apply_members(self, members: set[int]) -> None:
        if len(members) > MAX_MEMBERS:
            raise ValidationError(
                f'یک گروه نمی‌تواند بیش از {MAX_MEMBERS} عضو داشته باشد.',
                meta={'member_count': len(members), 'limit': MAX_MEMBERS},
            )
        self.member_ids = members


def _clean_name(name: str) -> str:
    cleaned = (name or '').strip()
    if not cleaned:
        raise ValidationError('نام گروه نمی‌تواند خالی باشد.')
    if len(cleaned) > MAX_NAME_LENGTH:
        raise ValidationError(f'نام گروه نباید بیش از {MAX_NAME_LENGTH} نویسه باشد.')
    return cleaned


def _as_id_set(student_ids: Iterable[int]) -> set[int]:
    try:
        return {int(student_id) for student_id in student_ids}
    except (TypeError, ValueError) as exc:
        raise ValidationError('شناسه‌ی دانش‌آموز باید عدد باشد.') from exc
