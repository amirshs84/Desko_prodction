"""Port: خواندن جلسات مطالعه از اپ ``api``.

کانتکست reporting هیچ‌وقت نمی‌نویسد و مدل ``StudySession`` را مستقیم import
نمی‌کند؛ فقط همین قرارداد باریک را می‌شناسد. پیاده‌سازی در
``reporting/infrastructure/django_study_report_reader.py`` است.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Protocol, runtime_checkable


@dataclass(frozen=True)
class SessionRecord:
    id: int
    subject_name: str
    subject_color: str
    description: str
    start_time: datetime
    end_time: datetime | None
    duration_seconds: int


@dataclass(frozen=True)
class StudyAggregate:
    """خلاصه مطالعه یک دانش‌آموز در یک بازه — برای فهرست مشاور."""

    user_id: int
    total_seconds: int
    session_count: int


@runtime_checkable
class StudyReportReader(Protocol):
    def list_sessions(
        self, user_id: int, *, since: datetime | None = None,
    ) -> list[SessionRecord]:
        """جلسات یک دانش‌آموز، جدیدترین‌ها اول؛ ``since`` اختیاری است."""
        ...

    def aggregate_for_users(
        self, user_ids: Iterable[int], *, since: datetime | None = None,
    ) -> dict[int, StudyAggregate]:
        """مجموع ثانیه و تعداد جلسه به‌ازای هر کاربر — یک کوئری گروهی."""
        ...
