"""آزمون DayAgenda و سیاست پنجره‌ی بیداری — خالص و بدون دیتابیس."""
from __future__ import annotations

from unittest import TestCase

from Planning.scheduling.domain.entities.calendar_event import CalendarEvent
from Planning.scheduling.domain.entities.day_agenda import DayAgenda, group_by_date
from Planning.scheduling.domain.enums import EventKind
from Planning.scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from Planning.scheduling.domain.value_objects.event_ref import EventRef
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate
from Planning.scheduling.domain.value_objects.time_range import TimeRange
from Planning.shared.domain.enums import WriteAuthority
from Planning.shared.domain.errors import DailyCapacityFullError, ValidationError

OWNER = 7
TODAY = JalaliDate(1404, 5, 3)
TOMORROW = JalaliDate(1404, 5, 4)


def event(
    client_id: str,
    start: str,
    end: str,
    *,
    date: JalaliDate = TODAY,
    all_day: bool = False,
    kind: EventKind = EventKind.MUTABLE,
) -> CalendarEvent:
    authority = (
        WriteAuthority.SCHOOL_MANAGER if kind is EventKind.IMMUTABLE
        else WriteAuthority.CONSULTANT
    )
    return CalendarEvent.create(
        ref=EventRef(owner_id=OWNER, client_id=client_id),
        date=date,
        slot=TimeRange.from_clock(start, end),
        title=client_id,
        all_day=all_day,
        kind=kind,
        authority=authority,
    )


def agenda(*events: CalendarEvent) -> DayAgenda:
    return DayAgenda.build(OWNER, TODAY, events)


class AwakeWindowPolicyTests(TestCase):
    def test_default_window_is_seven_to_twenty_three(self):
        policy = AwakeWindowPolicy.default()
        self.assertEqual(policy.window, TimeRange.from_clock('07:00', '23:00'))
        self.assertEqual(policy.capacity_minutes, 16 * 60)

    def test_ensure_contains_rejects_slot_outside_window(self):
        policy = AwakeWindowPolicy.default()
        policy.ensure_contains(TimeRange.from_clock('22:00', '23:00'))
        with self.assertRaises(ValidationError):
            policy.ensure_contains(TimeRange.from_clock('22:30', '23:30'))
        with self.assertRaises(ValidationError):
            policy.ensure_contains(TimeRange.from_clock('06:00', '07:30'))


class DayAgendaTests(TestCase):
    def test_only_keeps_events_of_that_day(self):
        day = DayAgenda.build(OWNER, TODAY, [event('a', '08:00', '09:00'),
                                             event('b', '08:00', '09:00', date=TOMORROW)])
        self.assertEqual([e.client_id for e in day.events], ['a'])

    def test_all_day_events_do_not_consume_capacity(self):
        day = agenda(event('note', '00:00', '24:00', all_day=True))
        self.assertEqual(day.busy_ranges(), [])
        self.assertEqual(day.free_minutes(), 16 * 60)

    def test_busy_ranges_are_merged(self):
        day = agenda(event('a', '08:00', '10:00'), event('b', '09:30', '11:00'))
        self.assertEqual(day.busy_ranges(), [TimeRange.from_clock('08:00', '11:00')])

    def test_conflicts_are_reported(self):
        day = agenda(event('class', '08:00', '09:30', kind=EventKind.IMMUTABLE))
        clashes = day.conflicts(TimeRange.from_clock('09:00', '10:00'))
        self.assertEqual([e.client_id for e in clashes], ['class'])
        self.assertTrue(day.is_free(TimeRange.from_clock('09:30', '11:00')))

    def test_touching_ranges_do_not_conflict(self):
        day = agenda(event('a', '08:00', '09:00'))
        self.assertTrue(day.is_free(TimeRange.from_clock('09:00', '10:00')))

    def test_exclude_client_id_ignores_the_moving_event(self):
        day = agenda(event('a', '08:00', '09:00'))
        self.assertTrue(
            day.is_free(TimeRange.from_clock('08:00', '09:00'), exclude_client_id='a')
        )


class FindSlotTests(TestCase):
    def test_empty_day_places_at_preferred_time(self):
        slot = agenda().find_slot(90, preferred_start=14 * 60)
        self.assertEqual(slot, TimeRange.from_clock('14:00', '15:30'))

    def test_snaps_forward_when_preferred_time_is_taken(self):
        day = agenda(event('class', '14:00', '15:00', kind=EventKind.IMMUTABLE))
        slot = day.find_slot(90, preferred_start=14 * 60)
        self.assertEqual(slot, TimeRange.from_clock('15:00', '16:30'))

    def test_falls_back_to_earlier_gap_when_rest_of_day_is_full(self):
        day = agenda(event('evening', '15:00', '23:00'))
        slot = day.find_slot(90, preferred_start=16 * 60)
        self.assertEqual(slot, TimeRange.from_clock('07:00', '08:30'))

    def test_placement_stays_inside_awake_window(self):
        slot = agenda().find_slot(60, preferred_start=23 * 60)
        self.assertEqual(slot, TimeRange.from_clock('07:00', '08:00'))

    def test_full_day_raises_capacity_error_with_diagnostics(self):
        day = agenda(event('all', '07:00', '22:30'))
        with self.assertRaises(DailyCapacityFullError) as ctx:
            day.find_slot(90, preferred_start=8 * 60)
        meta = ctx.exception.meta
        self.assertEqual(meta['requested_minutes'], 90)
        self.assertEqual(meta['free_minutes'], 30)
        self.assertEqual(meta['largest_free_minutes'], 30)
        self.assertEqual(meta['date'], '1404/05/03')

    def test_moving_event_can_reuse_its_own_space(self):
        day = agenda(event('a', '06:00', '22:00'), event('b', '22:00', '23:00'))
        slot = day.find_slot(60, preferred_start=22 * 60, exclude_client_id='b')
        self.assertEqual(slot, TimeRange.from_clock('22:00', '23:00'))


class GroupByDateTests(TestCase):
    def test_groups_events_per_day(self):
        grouped = group_by_date([
            event('a', '08:00', '09:00'),
            event('b', '10:00', '11:00'),
            event('c', '08:00', '09:00', date=TOMORROW),
        ])
        self.assertEqual(sorted(len(v) for v in grouped.values()), [1, 2])
        self.assertEqual([e.client_id for e in grouped[TOMORROW]], ['c'])
