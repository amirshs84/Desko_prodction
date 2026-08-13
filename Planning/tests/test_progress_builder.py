"""آزمون تجمیع گزارش پیشرفت — خالص، بدون دیتابیس.

تمرکز روی مرز روز تهران: جلسه‌ای که نزدیک نیمه‌شب است نباید بین پنل دانش‌آموز
و گزارش مشاور جابه‌جا شود.
"""
from __future__ import annotations

from datetime import datetime
from unittest import TestCase
from zoneinfo import ZoneInfo

from Planning.reporting.application.iran_clock import IRAN_TZ, ReportWindows, iran_date_key
from Planning.reporting.application.ports.study_report_reader import SessionRecord
from Planning.reporting.application.progress_builder import build_progress_report
from Planning.reporting.application.activity_builders import (
    build_actual_calendar,
    build_daily_report,
)
from Planning.shared.application.ports.school_directory import StudentInfo

STUDENT = StudentInfo(
    user_id=11,
    school_id=1,
    full_name='علی',
    phone_number='09120000000',
    grade='11',
    olympiad_field='math',
)


def session(
    sid: int, start: datetime, seconds: int, *, subject: str = 'ریاضی', color: str = '#10b981',
) -> SessionRecord:
    return SessionRecord(
        id=sid,
        subject_name=subject,
        subject_color=color,
        description='',
        start_time=start,
        end_time=None,
        duration_seconds=seconds,
    )


class IranClockTests(TestCase):
    def test_windows_use_tehran_midnight(self):
        # 00:30 تهرانِ ۲۵ جولای = ۱۹:۰۰ UTC روز قبل
        now = datetime(2025, 7, 24, 21, 0, tzinfo=ZoneInfo('UTC'))
        windows = ReportWindows.at(now)
        self.assertEqual(windows.today.isoformat(), '2025-07-25')
        self.assertEqual(windows.today_start, datetime(2025, 7, 25, 0, 0, tzinfo=IRAN_TZ))
        self.assertEqual(windows.week_start.date().isoformat(), '2025-07-18')

    def test_iran_date_key_near_midnight(self):
        # ۲۳:۳۰ تهران ۲۴ جولای
        late = datetime(2025, 7, 24, 20, 0, tzinfo=ZoneInfo('UTC'))
        self.assertEqual(iran_date_key(late), '2025-07-24')
        # ۰۰:۳۰ تهران ۲۵ جولای
        early = datetime(2025, 7, 24, 21, 0, tzinfo=ZoneInfo('UTC'))
        self.assertEqual(iran_date_key(early), '2025-07-25')


class ProgressBuilderTests(TestCase):
    def test_today_excludes_session_just_before_tehran_midnight(self):
        now = datetime(2025, 7, 25, 12, 0, tzinfo=IRAN_TZ)
        before_midnight = datetime(2025, 7, 24, 23, 30, tzinfo=IRAN_TZ)
        after_midnight = datetime(2025, 7, 25, 0, 30, tzinfo=IRAN_TZ)
        report = build_progress_report(
            STUDENT,
            [
                session(1, before_midnight, 1800),
                session(2, after_midnight, 3600),
            ],
            now=now,
            heatmap_days=3,
        )
        self.assertEqual(report.today, 3600)
        self.assertEqual(report.week, 5400)
        self.assertEqual(report.heatmap_data['2025-07-24'], 1800)
        self.assertEqual(report.heatmap_data['2025-07-25'], 3600)

    def test_subject_breakdown_and_percentages(self):
        now = datetime(2025, 7, 25, 12, 0, tzinfo=IRAN_TZ)
        report = build_progress_report(
            STUDENT,
            [
                session(1, now, 3000, subject='ریاضی'),
                session(2, now, 1000, subject='فیزیک', color='#f00'),
            ],
            now=now,
            heatmap_days=1,
        )
        self.assertEqual(
            [(row.name, row.total_seconds, row.percentage) for row in report.subjects_breakdown],
            [('ریاضی', 3000, 75), ('فیزیک', 1000, 25)],
        )
        self.assertEqual(report.subjects_today[0].name, 'ریاضی')

    def test_heatmap_covers_requested_span_oldest_first(self):
        now = datetime(2025, 7, 25, 12, 0, tzinfo=IRAN_TZ)
        report = build_progress_report(STUDENT, [], now=now, heatmap_days=5)
        self.assertEqual(len(report.heatmap), 5)
        self.assertEqual(report.heatmap[0].date, '2025-07-21')
        self.assertEqual(report.heatmap[-1].date, '2025-07-25')

    def test_week_window_matches_student_dashboard_lookback(self):
        # تب weekly فرانت: از ابتدای امروز منهای ۷ روز
        now = datetime(2025, 7, 25, 18, 0, tzinfo=IRAN_TZ)
        inside = datetime(2025, 7, 18, 0, 0, tzinfo=IRAN_TZ)
        outside = datetime(2025, 7, 17, 23, 59, tzinfo=IRAN_TZ)
        report = build_progress_report(
            STUDENT,
            [session(1, inside, 100), session(2, outside, 200)],
            now=now,
            heatmap_days=30,
        )
        self.assertEqual(report.week, 100)
        self.assertEqual(report.month, 300)


class DailyReportBuilderTests(TestCase):
    def test_keeps_only_sessions_of_that_tehran_day(self):
        day = datetime(2025, 7, 25, 0, 0, tzinfo=IRAN_TZ).date()
        before = datetime(2025, 7, 24, 23, 30, tzinfo=IRAN_TZ)
        morning = datetime(2025, 7, 25, 8, 0, tzinfo=IRAN_TZ)
        afternoon = datetime(2025, 7, 25, 16, 30, tzinfo=IRAN_TZ)
        after = datetime(2025, 7, 26, 0, 10, tzinfo=IRAN_TZ)
        report = build_daily_report(
            STUDENT,
            [
                session(1, before, 1800),
                session(2, morning, 3600, subject='ریاضی'),
                session(3, afternoon, 1800, subject='فیزیک', color='#f00'),
                session(4, after, 900),
            ],
            day=day,
        )
        self.assertEqual(report.date, '2025-07-25')
        self.assertEqual(report.jy, 1404)
        self.assertEqual(report.jm, 5)
        self.assertEqual(report.jd, 3)
        self.assertEqual(report.total_seconds, 5400)
        self.assertEqual(report.session_count, 2)
        self.assertEqual([item.title for item in report.items], ['ریاضی', 'فیزیک'])
        self.assertEqual(report.items[0].start_minutes, 8 * 60)
        self.assertEqual(report.items[0].end_minutes, 9 * 60)
        self.assertEqual(report.items[0].kind, 'study')
        self.assertEqual(report.items[0].source, 'study_log')

    def test_empty_day_returns_zero_totals(self):
        report = build_daily_report(
            STUDENT, [session(1, datetime(2025, 7, 24, 10, 0, tzinfo=IRAN_TZ), 600)],
            day=datetime(2025, 7, 25, 0, 0, tzinfo=IRAN_TZ).date(),
        )
        self.assertEqual(report.total_seconds, 0)
        self.assertEqual(report.session_count, 0)
        self.assertEqual(report.items, ())


class ActualCalendarBuilderTests(TestCase):
    def test_events_use_study_log_start_and_end(self):
        start = datetime(2025, 7, 25, 10, 15, tzinfo=IRAN_TZ)
        row = SessionRecord(
            id=9,
            subject_name='شیمی',
            subject_color='#e11',
            description='تست',
            start_time=start,
            end_time=datetime(2025, 7, 25, 11, 0, tzinfo=IRAN_TZ),
            duration_seconds=2700,
        )
        report = build_actual_calendar(
            STUDENT, [row],
            date_from=datetime(2025, 7, 1, tzinfo=IRAN_TZ).date(),
            date_to=datetime(2025, 7, 31, tzinfo=IRAN_TZ).date(),
        )
        self.assertEqual(report.kind, 'actual')
        self.assertEqual(report.source, 'study_log')
        self.assertEqual(report.session_count, 1)
        event = report.events[0]
        self.assertEqual(event.start_minutes, 10 * 60 + 15)
        self.assertEqual(event.end_minutes, 11 * 60)
        self.assertEqual((event.jy, event.jm, event.jd), (1404, 5, 3))

    def test_overnight_session_clips_to_end_of_start_day(self):
        start = datetime(2025, 7, 25, 23, 30, tzinfo=IRAN_TZ)
        end = datetime(2025, 7, 26, 0, 30, tzinfo=IRAN_TZ)
        row = SessionRecord(
            id=1, subject_name='ریاضی', subject_color='#10b981', description='',
            start_time=start, end_time=end, duration_seconds=3600,
        )
        report = build_actual_calendar(
            STUDENT, [row],
            date_from=datetime(2025, 7, 25, tzinfo=IRAN_TZ).date(),
            date_to=datetime(2025, 7, 25, tzinfo=IRAN_TZ).date(),
        )
        self.assertEqual(report.events[0].end_minutes, 1440)
