"""تجمیع خالص جلسات → گزارش پیشرفت.

بدون Django و بدون I/O. ورودی: فهرست جلسات + اطلاعات نمایشی دانش‌آموز + لحظه‌ی
مرجع. خروجی همیشه برای ورودی یکسان، یکسان است — همان چیزی که تست بیت‌به‌بیت
«مشاور = دانش‌آموز» را ممکن می‌کند.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Sequence

from ...shared.application.ports.school_directory import StudentInfo
from .dto.progress_dto import (
    HeatmapDayDTO,
    SessionDTO,
    StudentProgressDTO,
    SubjectBreakdownDTO,
)
from .iran_clock import DEFAULT_HEATMAP_DAYS, ReportWindows, iran_date_key
from .ports.study_report_reader import SessionRecord

RECENT_SESSION_LIMIT = 200


def build_progress_report(
    student: StudentInfo,
    sessions: Sequence[SessionRecord],
    *,
    now: datetime,
    heatmap_days: int = DEFAULT_HEATMAP_DAYS,
) -> StudentProgressDTO:
    windows = ReportWindows.at(now, heatmap_days=heatmap_days)

    today_sessions = _since(sessions, windows.today_start)
    week_sessions = _since(sessions, windows.week_start)
    month_sessions = _since(sessions, windows.month_start)

    return StudentProgressDTO(
        user_id=student.user_id,
        student_name=student.full_name,
        phone_number=student.phone_number,
        grade=student.grade,
        olympiad_field=student.olympiad_field,
        today=_total_seconds(today_sessions),
        week=_total_seconds(week_sessions),
        month=_total_seconds(month_sessions),
        total_sessions=len(sessions),
        subjects_breakdown=_subject_breakdown(sessions),
        subjects_today=_subject_breakdown(today_sessions),
        subjects_week=_subject_breakdown(week_sessions),
        subjects_month=_subject_breakdown(month_sessions),
        recent_sessions=tuple(
            _to_session_dto(session) for session in sessions[:RECENT_SESSION_LIMIT]
        ),
        heatmap=_heatmap(sessions, windows, heatmap_days),
    )


def _since(sessions: Sequence[SessionRecord], start: datetime) -> list[SessionRecord]:
    return [session for session in sessions if session.start_time >= start]


def _total_seconds(sessions: Sequence[SessionRecord]) -> int:
    return sum(session.duration_seconds for session in sessions)


def _subject_breakdown(sessions: Sequence[SessionRecord]) -> tuple[SubjectBreakdownDTO, ...]:
    totals: dict[str, list] = defaultdict(lambda: [0, '#10b981'])
    for session in sessions:
        name = session.subject_name or 'بدون موضوع'
        totals[name][0] += session.duration_seconds
        if session.subject_color:
            totals[name][1] = session.subject_color
    grand = sum(seconds for seconds, _ in totals.values()) or 0
    rows = sorted(totals.items(), key=lambda item: (-item[1][0], item[0]))
    return tuple(
        SubjectBreakdownDTO(
            name=name,
            color=color,
            total_seconds=seconds,
            percentage=round((seconds / grand) * 100) if grand else 0,
        )
        for name, (seconds, color) in rows
    )


def _heatmap(
    sessions: Sequence[SessionRecord],
    windows: ReportWindows,
    heatmap_days: int,
) -> tuple[HeatmapDayDTO, ...]:
    by_day: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for session in sessions:
        if session.start_time < windows.heatmap_start:
            continue
        key = iran_date_key(session.start_time)
        by_day[key][0] += session.duration_seconds
        by_day[key][1] += 1

    days: list[HeatmapDayDTO] = []
    for offset in range(heatmap_days - 1, -1, -1):
        day = windows.today - timedelta(days=offset)
        key = day.isoformat()
        seconds, count = by_day.get(key, [0, 0])
        days.append(HeatmapDayDTO(date=key, total_seconds=seconds, sessions=count))
    return tuple(days)


def _to_session_dto(session: SessionRecord) -> SessionDTO:
    return SessionDTO(
        id=session.id,
        subject=session.subject_name or 'بدون موضوع',
        subject_color=session.subject_color or '#10b981',
        duration_seconds=session.duration_seconds,
        start_time=session.start_time,
        end_time=session.end_time,
        description=session.description or '',
    )
