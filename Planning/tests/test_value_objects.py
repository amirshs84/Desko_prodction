"""آزمون Value Object های تقویم — بدون دیتابیس و بدون Django ORM.

تبدیل تاریخ شمسی قلب همه‌ی محاسبات برنامه‌ریزی است؛ اگر یک روز جابه‌جا شود، کل
برنامه‌ی هفتگی دانش‌آموز غلط می‌شود. پس اینجا رفت‌وبرگشت تبدیل روی چند سال کامل
سنجیده می‌شود، نه چند نمونه‌ی دستی.
"""
from __future__ import annotations

from datetime import date, timedelta
from unittest import TestCase

from Planning.scheduling.domain.value_objects.jalali_date import (
    JalaliDate,
    gregorian_to_jalali,
    jalali_to_gregorian,
)
from Planning.scheduling.domain.value_objects.time_range import MINUTES_IN_DAY, TimeRange
from Planning.scheduling.domain.value_objects.weekly_recurrence import WeeklyRecurrence
from Planning.shared.domain.errors import InvalidTimeRangeError, ValidationError


class JalaliDateTests(TestCase):
    def test_roundtrip_over_several_years(self):
        current = date(2022, 1, 1)
        end = date(2030, 12, 31)
        while current <= end:
            jy, jm, jd = gregorian_to_jalali(current.year, current.month, current.day)
            self.assertEqual(
                jalali_to_gregorian(jy, jm, jd),
                (current.year, current.month, current.day),
            )
            current += timedelta(days=1)

    def test_known_conversion(self):
        self.assertEqual(JalaliDate(1404, 5, 3).to_gregorian(), date(2025, 7, 25))
        self.assertEqual(JalaliDate.from_gregorian(date(2026, 3, 21)), JalaliDate(1405, 1, 1))

    def test_weekday_matches_frontend_convention(self):
        # ۳ مرداد ۱۴۰۴ = ۲۵ جولای ۲۰۲۵ = جمعه → در قرارداد شنبه=۰ باید ۶ باشد.
        self.assertEqual(JalaliDate(1404, 5, 3).weekday(), 6)
        self.assertTrue(JalaliDate(1404, 5, 3).is_friday)
        self.assertEqual(JalaliDate(1404, 5, 4).weekday(), 0)  # شنبه
        self.assertEqual(JalaliDate(1404, 5, 5).weekday(), 1)  # یک‌شنبه

    def test_week_start_is_saturday(self):
        self.assertEqual(JalaliDate(1404, 5, 8).week_start(), JalaliDate(1404, 5, 4))

    def test_add_days_crosses_month_and_year(self):
        self.assertEqual(JalaliDate(1404, 6, 31).add_days(1), JalaliDate(1404, 7, 1))
        self.assertEqual(JalaliDate(1403, 12, 30).add_days(1), JalaliDate(1404, 1, 1))
        self.assertEqual(JalaliDate(1404, 1, 1).add_days(-1), JalaliDate(1403, 12, 30))

    def test_leap_year_last_day(self):
        self.assertEqual(JalaliDate(1403, 12, 30).jd, 30)  # ۱۴۰۳ کبیسه است
        with self.assertRaises(ValidationError):
            JalaliDate(1404, 12, 30)  # ۱۴۰۴ کبیسه نیست
        with self.assertRaises(ValidationError):
            JalaliDate(1404, 7, 31)  # نیمه‌ی دوم سال ۳۰ روزه است

    def test_invalid_components_rejected(self):
        with self.assertRaises(ValidationError):
            JalaliDate(1404, 13, 1)
        with self.assertRaises(ValidationError):
            JalaliDate(1404, 1, 0)

    def test_days_until_and_iteration(self):
        start, end = JalaliDate(1404, 5, 1), JalaliDate(1404, 5, 10)
        self.assertEqual(start.days_until(end), 9)
        self.assertEqual(len(list(start.iter_range_to(end))), 10)
        with self.assertRaises(ValidationError):
            list(end.iter_range_to(start))


class TimeRangeTests(TestCase):
    def test_duration_and_clock_parsing(self):
        slot = TimeRange.from_clock('08:00', '09:30')
        self.assertEqual((slot.start_minutes, slot.end_minutes), (480, 570))
        self.assertEqual(slot.duration_minutes, 90)
        self.assertEqual(str(slot), '08:00–09:30')

    def test_invalid_ranges_rejected(self):
        for start, end in [(600, 600), (700, 600), (-1, 100), (0, MINUTES_IN_DAY + 1)]:
            with self.subTest(start=start, end=end):
                with self.assertRaises(InvalidTimeRangeError):
                    TimeRange(start, end)

    def test_overlap_is_half_open(self):
        first = TimeRange(480, 540)
        self.assertFalse(first.overlaps(TimeRange(540, 600)))
        self.assertFalse(TimeRange(540, 600).overlaps(first))
        self.assertTrue(first.overlaps(TimeRange(530, 600)))
        self.assertTrue(first.overlaps(TimeRange(490, 500)))

    def test_contains_and_shift(self):
        window = TimeRange.from_clock('06:00', '23:00')
        self.assertTrue(window.contains(TimeRange(480, 570)))
        self.assertFalse(window.contains(TimeRange(300, 400)))
        moved = TimeRange(480, 570).shifted_to(600)
        self.assertEqual((moved.start_minutes, moved.end_minutes), (600, 690))


class WeeklyRecurrenceTests(TestCase):
    def test_expands_selected_weekdays(self):
        recurrence = WeeklyRecurrence(
            weekdays=(0, 2),  # شنبه و دوشنبه
            start=JalaliDate(1404, 5, 4),  # شنبه
            end=JalaliDate(1404, 5, 17),
        )
        days = recurrence.dates()
        self.assertEqual(
            days,
            [
                JalaliDate(1404, 5, 4), JalaliDate(1404, 5, 6),
                JalaliDate(1404, 5, 11), JalaliDate(1404, 5, 13),
            ],
        )
        self.assertTrue(all(day.weekday() in (0, 2) for day in days))

    def test_rejects_invalid_input(self):
        with self.assertRaises(ValidationError):
            WeeklyRecurrence(weekdays=(), start=JalaliDate(1404, 5, 4), end=JalaliDate(1404, 5, 5))
        with self.assertRaises(ValidationError):
            WeeklyRecurrence(weekdays=(7,), start=JalaliDate(1404, 5, 4), end=JalaliDate(1404, 5, 5))
        with self.assertRaises(ValidationError):
            WeeklyRecurrence(weekdays=(0,), start=JalaliDate(1404, 5, 5), end=JalaliDate(1404, 5, 4))
        with self.assertRaises(ValidationError):
            WeeklyRecurrence(weekdays=(0,), start=JalaliDate(1400, 1, 1), end=JalaliDate(1403, 1, 1))
