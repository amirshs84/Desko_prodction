"""DTO های گروه و فهرست دانش‌آموزان.

گروه به‌همراه اطلاعات نمایشی اعضا برگردانده می‌شود (نه فقط شناسه)، چون UI مشاور
بدون نام و پایه‌ی دانش‌آموز بی‌فایده است و گروه‌ها کوچک‌اند؛ گرفتن آن‌ها در همان
درخواست، از رفت‌وبرگشت اضافه جلوگیری می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from ....shared.application.ports.school_directory import StudentInfo
from ...domain.entities.student_group import StudentGroup


@dataclass(frozen=True)
class StudentGroupDTO:
    id: int
    name: str
    description: str
    member_count: int
    members: tuple[StudentInfo, ...]
    created_at: datetime | None

    @classmethod
    def build(cls, group: StudentGroup, members: tuple[StudentInfo, ...]) -> 'StudentGroupDTO':
        return cls(
            id=group.id,
            name=group.name,
            description=group.description,
            member_count=group.member_count,
            members=members,
            created_at=group.created_at,
        )


@dataclass(frozen=True)
class RosterEntryDTO:
    """یک ردیف از فهرست دانش‌آموزان مدرسه، به‌همراه گروه‌های همین مشاور."""

    student: StudentInfo
    groups: tuple[tuple[int, str], ...] = ()
