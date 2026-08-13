"""تجمیع لاگ‌های مطالعه → گزارش روزانه و تقویم عملی.

بدون Django. ورودی: جلسات + روز/بازه. خروجی پایدار برای تست بیت‌به‌بیت.

C_actual فعلاً فقط StudySession است (start_time / end_time). شکل رویداد با
مختصات تقویم برنامه‌ریزی یکی است تا نرخ انطباق فاز بعد بدون مهاجرت ساخته شود.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Sequence

from ...scheduling.domain.value_objects.jalali_date import JalaliDate
from ...scheduling.domain.value_objects.time_range import MINUTES_IN_DAY
from ...shared.application.ports.school_directory import StudentInfo
from .dto.progress_dto import (
    ACTUAL_SOURCE_STUDY_LOG,
    TIMELINE_KIND_STUDY,
    ActualCalendarDTO,
    DailyReportDTO,
    TimelineItemDTO,
)
from .iran_clock import iran_date_key, to_iran
from .ports.study_report_reader import SessionRecord
from .progress_builder import _subject_breakdown, _total_seconds


def build_daily_report(
    student: StudentInfo,
    sessions: Sequence[SessionRecord],
    *,
    day: date,
) -> DailyReportDTO:
    jalali = JalaliDate.from_gregorian(day)
    day_key = day.isoformat()
    of_day = [
        session for session in sessions
        if iran_date_key(session.start_time) == day_key
    ]
    items = tuple(
        _to_timeline_item(session)
        for session in sorted(of_day, key=lambda s: s.start_time)
    )
    return DailyReportDTO(
        user_id=student.user_id,
        student_name=student.full_name,
        date=day_key,
        jy=jalali.jy,
        jm=jalali.jm,
        jd=jalali.jd,
        total_seconds=_total_seconds(of_day),
        session_count=len(of_day),
        subjects=_subject_breakdown(of_day),
        items=items,
    )


def build_actual_calendar(
    student: StudentInfo,
    sessions: Sequence[SessionRecord],
    *,
    date_from: date,
    date_to: date,
) -> ActualCalendarDTO:
    items = tuple(
        _to_timeline_item(session)
        for session in sorted(sessions, key=lambda s: s.start_time)
        if date_from <= to_iran(session.start_time).date() <= date_to
    )
    return ActualCalendarDTO(
        kind='actual',
        source=ACTUAL_SOURCE_STUDY_LOG,
        user_id=student.user_id,
        student_name=student.full_name,
        date_from=date_from.isoformat(),
        date_to=date_to.isoformat(),
        total_seconds=sum(item.duration_seconds for item in items),
        session_count=len(items),
        events=items,
    )


def _to_timeline_item(session: SessionRecord) -> TimelineItemDTO:
    start = to_iran(session.start_time)
    end = to_iran(session.end_time) if session.end_time is not None else None
    duration = _duration(session)
    start_minutes, end_minutes = _slot_minutes(start, end, duration)
    jalali = JalaliDate.from_gregorian(start.date())
    return TimelineItemDTO(
        id=f'study-{session.id}',
        kind=TIMELINE_KIND_STUDY,
        title=session.subject_name or 'بدون موضوع',
        color=session.subject_color or '#10b981',
        start_time=start,
        end_time=end,
        start_minutes=start_minutes,
        end_minutes=end_minutes,
        duration_seconds=duration,
        description=session.description or '',
        source=ACTUAL_SOURCE_STUDY_LOG,
        jy=jalali.jy,
        jm=jalali.jm,
        jd=jalali.jd,
        date=start.date().isoformat(),
    )


def _duration(session: SessionRecord) -> int:
    if session.duration_seconds:
        return int(session.duration_seconds)
    if session.end_time is not None:
        return max(0, int((session.end_time - session.start_time).total_seconds()))
    return 0


def _slot_minutes(
    start: datetime,
    end: datetime | None,
    duration_seconds: int,
) -> tuple[int, int]:
    """دقیقه از نیمه‌شب تهران؛ جلسهٔ شبانه تا ۲۴:۰۰ همان روز برش می‌خورد."""
    start_minutes = start.hour * 60 + start.minute
    if end is None:
        end_minutes = start_minutes + max(duration_seconds // 60, 1)
    elif end.date() > start.date():
        end_minutes = MINUTES_IN_DAY
    else:
        end_minutes = end.hour * 60 + end.minute
        if end.second or end.microsecond:
            end_minutes = min(end_minutes + 1, MINUTES_IN_DAY)
    if end_minutes <= start_minutes:
        end_minutes = min(start_minutes + max(duration_seconds // 60, 1), MINUTES_IN_DAY)
    return start_minutes, min(end_minutes, MINUTES_IN_DAY)
