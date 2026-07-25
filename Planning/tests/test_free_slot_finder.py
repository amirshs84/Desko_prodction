"""آزمون توابع خالص فضای خالی — بدون دیتابیس و بدون Django."""
from __future__ import annotations

from unittest import TestCase

from Planning.scheduling.domain.services.free_slot_finder import (
    first_fit,
    free_gaps,
    merge_ranges,
    total_minutes,
)
from Planning.scheduling.domain.value_objects.time_range import TimeRange


def tr(start: str, end: str) -> TimeRange:
    return TimeRange.from_clock(start, end)


WINDOW = tr('06:00', '23:00')


class MergeRangesTests(TestCase):
    def test_overlapping_ranges_are_merged(self):
        merged = merge_ranges([tr('08:00', '10:00'), tr('09:00', '11:00')])
        self.assertEqual(merged, [tr('08:00', '11:00')])

    def test_adjacent_ranges_are_merged(self):
        merged = merge_ranges([tr('08:00', '09:00'), tr('09:00', '10:00')])
        self.assertEqual(merged, [tr('08:00', '10:00')])

    def test_disjoint_ranges_stay_separate_and_sorted(self):
        merged = merge_ranges([tr('14:00', '15:00'), tr('08:00', '09:00')])
        self.assertEqual(merged, [tr('08:00', '09:00'), tr('14:00', '15:00')])

    def test_nested_range_is_absorbed(self):
        merged = merge_ranges([tr('08:00', '12:00'), tr('09:00', '10:00')])
        self.assertEqual(merged, [tr('08:00', '12:00')])


class FreeGapsTests(TestCase):
    def test_empty_day_is_one_big_gap(self):
        self.assertEqual(free_gaps(WINDOW, []), [WINDOW])

    def test_gaps_around_busy_blocks(self):
        gaps = free_gaps(WINDOW, [tr('08:00', '10:00'), tr('12:00', '13:00')])
        self.assertEqual(
            gaps, [tr('06:00', '08:00'), tr('10:00', '12:00'), tr('13:00', '23:00')],
        )

    def test_busy_outside_window_is_ignored(self):
        gaps = free_gaps(WINDOW, [tr('00:00', '05:00'), tr('23:00', '24:00')])
        self.assertEqual(gaps, [WINDOW])

    def test_busy_partially_outside_window_clips(self):
        gaps = free_gaps(WINDOW, [tr('05:00', '07:00')])
        self.assertEqual(gaps, [tr('07:00', '23:00')])

    def test_full_day_leaves_no_gap(self):
        self.assertEqual(free_gaps(WINDOW, [tr('06:00', '23:00')]), [])

    def test_min_duration_filters_small_gaps(self):
        busy = [tr('06:00', '08:00'), tr('08:30', '23:00')]
        self.assertEqual(free_gaps(WINDOW, busy), [tr('08:00', '08:30')])
        self.assertEqual(free_gaps(WINDOW, busy, min_duration=60), [])


class FirstFitTests(TestCase):
    def test_places_at_window_start_when_day_is_empty(self):
        self.assertEqual(first_fit(WINDOW, [], 90), tr('06:00', '07:30'))

    def test_honours_not_before(self):
        self.assertEqual(first_fit(WINDOW, [], 90, not_before=14 * 60), tr('14:00', '15:30'))

    def test_skips_busy_block(self):
        busy = [tr('14:00', '15:00')]
        self.assertEqual(
            first_fit(WINDOW, busy, 90, not_before=14 * 60), tr('15:00', '16:30'),
        )

    def test_snaps_into_window_when_requested_before_it(self):
        self.assertEqual(first_fit(WINDOW, [], 90, not_before=0), tr('06:00', '07:30'))

    def test_returns_none_when_nothing_fits(self):
        busy = [tr('06:00', '22:30')]
        self.assertIsNone(first_fit(WINDOW, busy, 90))

    def test_returns_none_for_non_positive_duration(self):
        self.assertIsNone(first_fit(WINDOW, [], 0))

    def test_finds_an_exact_size_gap(self):
        busy = [tr('06:00', '10:00'), tr('11:30', '23:00')]
        self.assertEqual(first_fit(WINDOW, busy, 90), tr('10:00', '11:30'))

    def test_total_minutes(self):
        self.assertEqual(total_minutes([tr('06:00', '07:00'), tr('08:00', '08:30')]), 90)
