"""DTO گزارش پیشرفت — شکل سازگار با پنل دانش‌آموز و پروفایل مدیر."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class SubjectBreakdownDTO:
    name: str
    color: str
    total_seconds: int
    percentage: int = 0


@dataclass(frozen=True)
class SessionDTO:
    id: int
    subject: str
    subject_color: str
    duration_seconds: int
    start_time: datetime
    end_time: datetime | None
    description: str


@dataclass(frozen=True)
class HeatmapDayDTO:
    date: str
    total_seconds: int
    sessions: int


@dataclass(frozen=True)
class StudentProgressDTO:
    """گزارش کامل پیشرفت یک دانش‌آموز.

    فیلدهای ``today``/``week``/``month`` بر حسب ثانیه و با مرز روز تهران محاسبه
    شده‌اند — همان قرارداد پنل دانش‌آموز. ``heatmap`` نود روز اخیر است؛
    ``heatmap_data`` همان اطلاعات به‌صورت دیکشنری برای کلاینت قدیمی مدیر است.
    """

    user_id: int
    student_name: str
    phone_number: str
    grade: str
    olympiad_field: str
    today: int
    week: int
    month: int
    total_sessions: int
    subjects_breakdown: tuple[SubjectBreakdownDTO, ...]
    subjects_today: tuple[SubjectBreakdownDTO, ...]
    subjects_week: tuple[SubjectBreakdownDTO, ...]
    subjects_month: tuple[SubjectBreakdownDTO, ...]
    recent_sessions: tuple[SessionDTO, ...]
    heatmap: tuple[HeatmapDayDTO, ...]

    @property
    def heatmap_data(self) -> dict[str, int]:
        return {day.date: day.total_seconds for day in self.heatmap}
