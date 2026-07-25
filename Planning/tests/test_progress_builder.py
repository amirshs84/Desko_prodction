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
