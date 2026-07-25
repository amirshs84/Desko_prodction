"""آزمون مخزن رویداد تقویم روی دیتابیس واقعی تست.

نکته‌های حساسی که اینجا سنجیده می‌شوند: idempotent بودن درج دسته‌ای (تلاش مجدد
کلاینت نباید رکورد تکراری بسازد)، همگام ماندن ستون تاریخ میلادی با تاریخ شمسی، و
کنترل همزمانی خوش‌بینانه هنگام ویرایش هم‌زمان از دو نشست.
"""
from __future__ import annotations

from django.contrib.auth.models import User
from django.test import TestCase

from Planning.models import CalendarEventModel
from Planning.scheduling.domain.entities.calendar_event import CalendarEvent
from Planning.scheduling.domain.enums import EventKind
from Planning.scheduling.domain.value_objects.event_ref import EventRef
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate
from Planning.scheduling.domain.value_objects.time_range import TimeRange
from Planning.scheduling.infrastructure.persistence.repositories.calendar_event_repository import (
    DjangoCalendarEventRepository,
)
from Planning.shared.domain.enums import WriteAuthority
from Planning.shared.domain.errors import ConcurrencyConflictError, NotFoundError


class CalendarEventRepositoryTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create(username='09120000001')
        self.repo = DjangoCalendarEventRepository()

    def _event(self, client_id: str, day: JalaliDate, *, group_id: str = '') -> CalendarEvent:
        return CalendarEvent.create(
            ref=EventRef(owner_id=self.user.id, client_id=client_id),
            date=day,
            slot=TimeRange(480, 570),
            title='ریاضی',
            authority=WriteAuthority.STUDENT,
            group_id=group_id,
        )

    def test_add_many_is_idempotent(self):
        events = [self._event('a', JalaliDate(1404, 5, 4))]
        self.assertEqual(self.repo.add_many(events), 1)
        self.assertEqual(self.repo.add_many(events), 0)
        self.assertEqual(CalendarEventModel.objects.count(), 1)

    def test_stores_gregorian_mirror_of_jalali_date(self):
        self.repo.add_many([self._event('a', JalaliDate(1404, 5, 4))])
        row = CalendarEventModel.objects.get(client_id='a')
        self.assertEqual((row.jy, row.jm, row.jd), (1404, 5, 4))
        self.assertEqual(str(row.date), '2025-07-26')

    def test_date_range_filter_uses_gregorian_column(self):
        for index, day in enumerate(
            [JalaliDate(1404, 5, 4), JalaliDate(1404, 6, 31), JalaliDate(1404, 7, 1)]
        ):
            self.repo.add_many([self._event(f'e{index}', day)])

        found = self.repo.list_for_owner(
            self.user.id, date_from=JalaliDate(1404, 6, 1), date_to=JalaliDate(1404, 6, 31),
        )
        self.assertEqual([event.client_id for event in found], ['e1'])

    def test_save_bumps_version_and_detects_stale_write(self):
        event = self._event('a', JalaliDate(1404, 5, 4))
        self.repo.add_many([event])

        first = self.repo.get(EventRef(owner_id=self.user.id, client_id='a'))
        second = self.repo.get(EventRef(owner_id=self.user.id, client_id='a'))

        first.move_to(JalaliDate(1404, 5, 5), TimeRange(600, 690), authority=WriteAuthority.STUDENT)
        self.repo.save(first)
        self.assertEqual(CalendarEventModel.objects.get(client_id='a').version, 2)

        # نشست دوم روی نسخه‌ی کهنه می‌نویسد → باید رد شود.
        second.move_to(JalaliDate(1404, 5, 6), TimeRange(700, 790), authority=WriteAuthority.STUDENT)
        with self.assertRaises(ConcurrencyConflictError):
            self.repo.save(second)

    def test_get_and_delete_missing_event(self):
        ref = EventRef(owner_id=self.user.id, client_id='ghost')
        self.assertIsNone(self.repo.find(ref))
        with self.assertRaises(NotFoundError):
            self.repo.get(ref)
        with self.assertRaises(NotFoundError):
            self.repo.delete(ref)

    def test_group_listing_and_deletion(self):
        self.repo.add_many([
            self._event('a', JalaliDate(1404, 5, 4), group_id='g1'),
            self._event('b', JalaliDate(1404, 5, 11), group_id='g1'),
            self._event('c', JalaliDate(1404, 5, 12)),
        ])
        self.assertEqual(len(self.repo.list_by_group('g1')), 2)
        self.assertEqual(self.repo.list_by_group(''), [])
        self.assertEqual(self.repo.delete_by_group('g1'), 2)
        self.assertEqual(CalendarEventModel.objects.count(), 1)

    def test_list_by_owners_filters_kind(self):
        other = User.objects.create(username='09120000002')
        self.repo.add_many([
            self._event('a', JalaliDate(1404, 5, 4)),
            CalendarEvent.create(
                ref=EventRef(owner_id=other.id, client_id='fixed'),
                date=JalaliDate(1404, 5, 4),
                slot=TimeRange(600, 690),
                title='کلاس مدرسه',
                kind=EventKind.IMMUTABLE,
                authority=WriteAuthority.SCHOOL_MANAGER,
            ),
        ])
        found = self.repo.list_by_owners([self.user.id, other.id], kind=EventKind.IMMUTABLE)
        self.assertEqual([event.client_id for event in found], ['fixed'])
        self.assertEqual(self.repo.list_by_owners([]), [])
