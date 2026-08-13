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


# --- گزارش روزانه و تقویم عملی --------------------------------------------
# C_plan = رویدادهای تقویم برنامه‌ریزی (CalendarEvent)
# C_actual = لاگ‌های انجام‌شده (فعلاً فقط StudySession)
# نرخ انطباق فاز بعد: Rate = C_actual / C_plan × 100
# این DTOها شکل C_actual را با همان مختصات زمانی تقویم (jy/jm/jd + دقیقه)
# نگه می‌دارند تا تطبیق با C_plan بدون مهاجرت ممکن باشد.

ACTUAL_SOURCE_STUDY_LOG = 'study_log'
TIMELINE_KIND_STUDY = 'study'


@dataclass(frozen=True)
class TimelineItemDTO:
    """یک آیتم تایم‌لاین روز — ``kind`` برای کلاس/آزمون/پیام بعدی باز است."""

    id: str
    kind: str
    title: str
    color: str
    start_time: datetime
    end_time: datetime | None
    start_minutes: int
    end_minutes: int
    duration_seconds: int
    description: str
    source: str = ACTUAL_SOURCE_STUDY_LOG
    jy: int = 0
    jm: int = 0
    jd: int = 0
    date: str = ''


@dataclass(frozen=True)
class DailyReportDTO:
    """ریزفعالیت یک روز مشخص (مرز نیمه‌شب تهران)."""

    user_id: int
    student_name: str
    date: str
    jy: int
    jm: int
    jd: int
    total_seconds: int
    session_count: int
    subjects: tuple[SubjectBreakdownDTO, ...]
    items: tuple[TimelineItemDTO, ...]


@dataclass(frozen=True)
class ActualCalendarDTO:
    """تقویم عملی: فقط عملکرد ثبت‌شده، جدا از تقویم برنامه‌ریزی."""

    kind: str
    source: str
    user_id: int
    student_name: str
    date_from: str
    date_to: str
    total_seconds: int
    session_count: int
    events: tuple[TimelineItemDTO, ...]
