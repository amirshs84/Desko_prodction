"""آزمون قواعد دامنه‌ی رویداد تقویم — بدون دیتابیس.

مهم‌ترین قاعده‌ی این کانتکست این است: رویداد ثابت مدرسه فقط در اختیار مدیر مدرسه
است. اگر این آزمون‌ها بشکنند، یعنی مشاور یا موتور برنامه‌ریزی می‌تواند کلاس درسی
دانش‌آموز را بازنویسی کند.
"""
from __future__ import annotations

from unittest import TestCase

from Planning.scheduling.domain.entities.calendar_event import CalendarEvent
from Planning.scheduling.domain.enums import EventKind, EventOrigin
from Planning.scheduling.domain.value_objects.event_ref import EventRef
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate
from Planning.scheduling.domain.value_objects.time_range import TimeRange
from Planning.shared.domain.enums import WriteAuthority
from Planning.shared.domain.errors import ImmutableEventViolationError, ValidationError

DAY = JalaliDate(1404, 5, 4)
SLOT = TimeRange(480, 570)


def make_event(**overrides) -> CalendarEvent:
    params = {
        'ref': EventRef(owner_id=7, client_id='evt-1'),
        'date': DAY,
        'slot': SLOT,
        'title': 'ریاضی',
        'authority': WriteAuthority.STUDENT,
    }
    params.update(overrides)
    return CalendarEvent.create(**params)


class CalendarEventCreationTests(TestCase):
    def test_origin_follows_authority(self):
        cases = {
            WriteAuthority.STUDENT: EventOrigin.STUDENT,
            WriteAuthority.CONSULTANT: EventOrigin.CONSULTANT,
            WriteAuthority.ALGORITHM: EventOrigin.ALGORITHM,
        }
        for authority, origin in cases.items():
            with self.subTest(authority=authority):
                self.assertEqual(make_event(authority=authority).origin, origin)

    def test_only_manager_can_create_immutable_events(self):
        event = make_event(
            authority=WriteAuthority.SCHOOL_MANAGER, kind=EventKind.IMMUTABLE,
        )
        self.assertTrue(event.is_immutable)
        self.assertEqual(event.origin, EventOrigin.SCHOOL)

        for authority in (
            WriteAuthority.STUDENT, WriteAuthority.CONSULTANT, WriteAuthority.ALGORITHM,
        ):
            with self.subTest(authority=authority):
                with self.assertRaises(ImmutableEventViolationError):
                    make_event(authority=authority, kind=EventKind.IMMUTABLE)

    def test_all_day_event_spans_whole_day(self):
        event = make_event(all_day=True, slot=TimeRange(480, 570))
        self.assertEqual(event.slot, TimeRange.full_day())

    def test_title_is_required_and_trimmed(self):
        self.assertEqual(make_event(title='  زیست  ').title, 'زیست')
        with self.assertRaises(ValidationError):
            make_event(title='   ')
        with self.assertRaises(ValidationError):
            make_event(title='x' * 301)

    def test_identity_is_owner_plus_client_id(self):
        same = make_event(), make_event()
        self.assertEqual(*same)
        other_owner = make_event(ref=EventRef(owner_id=8, client_id='evt-1'))
        self.assertNotEqual(make_event(), other_owner)


class CalendarEventMutationTests(TestCase):
    def test_move_updates_date_and_slot_and_version(self):
        event = make_event()
        event.move_to(JalaliDate(1404, 5, 6), TimeRange(600, 690), authority=WriteAuthority.CONSULTANT)
        self.assertEqual(event.date, JalaliDate(1404, 5, 6))
        self.assertEqual(event.slot, TimeRange(600, 690))
        self.assertEqual(event.version, 2)

    def test_patch_only_touches_given_fields(self):
        event = make_event(description='قدیمی', color='#111111')
        event.apply_patch(authority=WriteAuthority.STUDENT, title='فیزیک')
        self.assertEqual(event.title, 'فیزیک')
        self.assertEqual(event.description, 'قدیمی')
        self.assertEqual(event.color, '#111111')
        self.assertEqual(event.date, DAY)

    def test_moving_all_day_event_keeps_full_day_slot(self):
        event = make_event(all_day=True)
        event.move_to(JalaliDate(1404, 5, 6), TimeRange(600, 690), authority=WriteAuthority.STUDENT)
        self.assertEqual(event.slot, TimeRange.full_day())

    def test_immutable_event_rejects_everyone_but_manager(self):
        for authority in (
            WriteAuthority.STUDENT, WriteAuthority.CONSULTANT, WriteAuthority.ALGORITHM,
        ):
            event = make_event(authority=WriteAuthority.SCHOOL_MANAGER, kind=EventKind.IMMUTABLE)
            with self.subTest(authority=authority):
                with self.assertRaises(ImmutableEventViolationError):
                    event.move_to(JalaliDate(1404, 5, 6), SLOT, authority=authority)
                with self.assertRaises(ImmutableEventViolationError):
                    event.apply_patch(authority=authority, title='تغییر')
                with self.assertRaises(ImmutableEventViolationError):
                    event.ensure_writable_by(authority)
                self.assertEqual(event.version, 1)

    def test_manager_can_still_fix_own_immutable_event(self):
        event = make_event(authority=WriteAuthority.SCHOOL_MANAGER, kind=EventKind.IMMUTABLE)
        event.apply_patch(authority=WriteAuthority.SCHOOL_MANAGER, title='ریاضی ۲')
        self.assertEqual(event.title, 'ریاضی ۲')

    def test_overlap_needs_same_day(self):
        first = make_event()
        same_day = make_event(ref=EventRef(owner_id=7, client_id='evt-2'), slot=TimeRange(500, 600))
        other_day = make_event(
            ref=EventRef(owner_id=7, client_id='evt-3'),
            date=JalaliDate(1404, 5, 5),
            slot=TimeRange(500, 600),
        )
        self.assertTrue(first.overlaps(same_day))
        self.assertFalse(first.overlaps(other_day))
