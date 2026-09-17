"""آزمون انتها‌به‌انتهای تقویم مشاور: پنل بلوک، فضای خالی، جای‌گذاری و درگ‌ودراپ."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

from Planning.models import CalendarEventModel
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate

TEMPLATES_URL = '/api/planning/block-templates/'
AVAILABILITY_URL = '/api/planning/calendar/availability/'
PLACE_URL = '/api/planning/calendar/blocks/'
DATE = '1404-05-03'


def minutes(clock: str) -> int:
    hours, mins = clock.split(':')
    return int(hours) * 60 + int(mins)


class BlockPlacementTestCase(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='ALEF1234')
        self.other_school = School.objects.create(name='دبیرستان ب', invitation_code='BE123456')
        self.student = self.make_user('09120000001', school=self.school)
        self.consultant = self.make_user('09120000100', role='consultant', school=self.school)
        self.foreign_consultant = self.make_user(
            '09120000101', role='consultant', school=self.other_school,
        )
        self.authenticate(self.consultant)

    def make_user(self, phone: str, *, role: str = 'student', school: School | None = None) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(user=user, phone_number=phone, role=role, school=school)
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def seed_event(
        self, client_id: str, start: str, end: str, *,
        kind: str = 'mutable', owner=None, jd: int = 3,
    ):
        day = JalaliDate(1404, 5, jd)
        return CalendarEventModel.objects.create(
            user=owner or self.student,
            client_id=client_id,
            group_id='',
            jy=day.jy, jm=day.jm, jd=day.jd,
            date=day.to_gregorian(),
            title=client_id,
            description='',
            start_minutes=minutes(start),
            end_minutes=minutes(end),
            color='#10b981',
            all_day=False,
            kind=kind,
            origin='school' if kind == 'immutable' else 'student',
        )

    def place(self, **payload):
        body = {'date': DATE, 'template': 'study_90', **payload}
        return self.client.post(f'{PLACE_URL}?user={self.student.id}', body, format='json')

    def move(self, client_id: str, **payload):
        return self.client.post(
            f'/api/planning/calendar/blocks/{client_id}/move/?user={self.student.id}',
            payload,
            format='json',
        )


class BlockTemplateTests(BlockPlacementTestCase):
    def test_default_template_is_ninety_minutes(self):
        response = self.client.get(TEMPLATES_URL)
        self.assertEqual(response.status_code, 200)
        by_key = {item['key']: item for item in response.data}
        self.assertEqual(by_key['study_90']['duration_minutes'], 90)
        self.assertEqual(by_key['study_90']['title'], 'مطالعه')
        self.assertFalse(by_key['study_90']['editable'])

    def test_requires_authentication(self):
        self.client.credentials()
        self.assertEqual(self.client.get(TEMPLATES_URL).status_code, 401)

    def test_consultant_can_create_custom_template_and_place_it(self):
        created = self.client.post(
            TEMPLATES_URL,
            {'title': 'زیست تستی', 'duration_minutes': 75, 'color': '#ef4444'},
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertTrue(created.data['editable'])
        self.assertTrue(created.data['key'].startswith('custom_'))

        listed = self.client.get(TEMPLATES_URL)
        keys = {item['key'] for item in listed.data}
        self.assertIn(created.data['key'], keys)

        placed = self.place(template=created.data['key'], start_minutes=minutes('14:00'))
        self.assertEqual(placed.status_code, 201, placed.data)
        self.assertEqual(placed.data['event']['title'], 'زیست تستی')
        self.assertEqual(
            placed.data['event']['end_minutes'] - placed.data['event']['start_minutes'],
            75,
        )

        deleted = self.client.delete(f'{TEMPLATES_URL}{created.data["key"]}/')
        self.assertEqual(deleted.status_code, 204)

    def test_cannot_delete_system_template(self):
        response = self.client.delete(f'{TEMPLATES_URL}study_90/')
        self.assertEqual(response.status_code, 400)


class AvailabilityTests(BlockPlacementTestCase):
    def url(self, **params) -> str:
        query = '&'.join(f'{key}={value}' for key, value in params.items())
        return f'{AVAILABILITY_URL}?user={self.student.id}&date={DATE}&{query}'

    def test_empty_day_is_fully_free_inside_awake_window(self):
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['window'], {
            'start_minutes': 420, 'end_minutes': 1380, 'duration_minutes': 960,
        })
        self.assertEqual(response.data['free_minutes'], 960)
        self.assertEqual(response.data['busy_minutes'], 0)
        self.assertEqual(len(response.data['free_slots']), 1)

    def test_fixed_class_reduces_free_space(self):
        self.seed_event('class-1', '08:00', '10:00', kind='immutable')
        response = self.client.get(self.url())
        self.assertEqual(response.data['busy_minutes'], 120)
        self.assertEqual(
            [(slot['start_minutes'], slot['end_minutes']) for slot in response.data['free_slots']],
            [(420, 480), (600, 1380)],
        )

    def test_duration_filter_hides_short_gaps(self):
        self.seed_event('a', '06:00', '08:00')
        self.seed_event('b', '08:30', '23:00')
        response = self.client.get(self.url(duration=60))
        self.assertEqual(response.data['free_slots'], [])
        self.assertEqual(response.data['largest_free_minutes'], 0)

    def test_date_parameter_is_required(self):
        response = self.client.get(f'{AVAILABILITY_URL}?user={self.student.id}')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')

    def test_consultant_of_another_school_is_blocked(self):
        self.authenticate(self.foreign_consultant)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.data['error']['code'], 'SCHOOL_MISMATCH')


class PlaceBlockTests(BlockPlacementTestCase):
    def test_places_template_block_at_requested_time(self):
        response = self.place(start_minutes=minutes('14:00'))
        self.assertEqual(response.status_code, 201, response.data)
        event = response.data['event']
        self.assertEqual((event['start_minutes'], event['end_minutes']), (840, 930))
        self.assertEqual(event['title'], 'مطالعه')
        self.assertEqual(event['kind'], 'mutable')
        self.assertEqual(event['origin'], 'consultant')
        self.assertFalse(response.data['snapped'])
        self.assertTrue(CalendarEventModel.objects.filter(user=self.student).exists())

    def test_snaps_to_first_free_slot_when_requested_time_is_busy(self):
        self.seed_event('class-1', '14:00', '15:00', kind='immutable')
        response = self.place(start_minutes=minutes('14:00'))
        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data['snapped'])
        self.assertEqual(response.data['requested_start_minutes'], 840)
        self.assertEqual(response.data['event']['start_minutes'], 900)

    def test_without_start_time_uses_beginning_of_awake_window(self):
        response = self.place()
        self.assertEqual(response.data['event']['start_minutes'], 420)

    def test_request_before_awake_window_snaps_into_it(self):
        response = self.place(start_minutes=minutes('04:00'))
        self.assertEqual(response.data['event']['start_minutes'], 420)
        self.assertTrue(response.data['snapped'])

    def test_snap_disabled_reports_conflict_with_details(self):
        self.seed_event('busy', '14:00', '15:00')
        response = self.place(start_minutes=minutes('14:30'), snap=False)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'CONFLICT')
        self.assertEqual(response.data['error']['meta']['conflicts'][0]['client_id'], 'busy')

    def test_snap_disabled_rejects_slot_outside_awake_window(self):
        response = self.place(start_minutes=minutes('23:00'), snap=False)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['error']['code'], 'VALIDATION_ERROR')

    def test_full_day_returns_daily_capacity_full(self):
        self.seed_event('all', '06:00', '22:30')
        response = self.place(start_minutes=minutes('08:00'))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'DAILY_CAPACITY_FULL')
        self.assertEqual(response.data['error']['meta']['largest_free_minutes'], 30)
        self.assertEqual(CalendarEventModel.objects.filter(title='مطالعه').count(), 0)

    def test_custom_duration_and_title(self):
        response = self.place(template='', duration_minutes=50, title='زیست', color='#ef4444')
        event = response.data['event']
        self.assertEqual(event['end_minutes'] - event['start_minutes'], 50)
        self.assertEqual(event['title'], 'زیست')
        self.assertEqual(event['color'], '#ef4444')

    def test_unknown_template_is_rejected(self):
        response = self.place(template='does_not_exist')
        self.assertEqual(response.status_code, 404)

    def test_missing_template_and_duration_is_rejected(self):
        response = self.place(template='')
        self.assertEqual(response.status_code, 400)

    def test_too_short_block_is_rejected(self):
        response = self.place(template='', duration_minutes=2, title='کوتاه')
        self.assertEqual(response.status_code, 400)

    def test_student_can_place_on_own_calendar(self):
        self.authenticate(self.student)
        response = self.client.post(
            PLACE_URL, {'date': DATE, 'template': 'study_90'}, format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['event']['origin'], 'student')

    def test_consultant_of_another_school_cannot_place(self):
        self.authenticate(self.foreign_consultant)
        response = self.place()
        self.assertEqual(response.status_code, 403)


class MoveBlockTests(BlockPlacementTestCase):
    def test_moves_event_to_free_time(self):
        self.seed_event('evt-1', '08:00', '09:30')
        response = self.move('evt-1', start_minutes=minutes('16:00'))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['event']['start_minutes'], 960)
        self.assertEqual(response.data['event']['end_minutes'], 1050)
        self.assertFalse(response.data['snapped'])

    def test_keeps_duration_when_moving(self):
        self.seed_event('evt-1', '08:00', '10:00')
        response = self.move('evt-1', start_minutes=minutes('16:00'))
        event = response.data['event']
        self.assertEqual(event['end_minutes'] - event['start_minutes'], 120)

    def test_snaps_when_target_is_busy(self):
        self.seed_event('evt-1', '08:00', '09:00')
        self.seed_event('other', '16:00', '17:00')
        response = self.move('evt-1', start_minutes=minutes('16:00'))
        self.assertTrue(response.data['snapped'])
        self.assertEqual(response.data['event']['start_minutes'], 1020)

    def test_moving_onto_itself_is_not_a_conflict(self):
        self.seed_event('evt-1', '08:00', '09:00')
        response = self.move('evt-1', start_minutes=minutes('08:00'), snap=False)
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['event']['start_minutes'], 480)

    def test_move_to_another_day(self):
        self.seed_event('evt-1', '08:00', '09:00')
        response = self.move('evt-1', date='1404-05-05', start_minutes=minutes('10:00'))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            (response.data['event']['jm'], response.data['event']['jd']), (5, 5),
        )
        self.assertEqual(response.data['event']['start_minutes'], 600)

    def test_immutable_event_cannot_be_moved(self):
        self.seed_event('class-1', '08:00', '09:30', kind='immutable')
        response = self.move('class-1', start_minutes=minutes('16:00'))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'IMMUTABLE_EVENT_VIOLATION')

    def test_stale_version_is_rejected(self):
        self.seed_event('evt-1', '08:00', '09:00')
        response = self.move('evt-1', start_minutes=minutes('16:00'), expected_version=5)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'CONCURRENCY_CONFLICT')

    def test_version_increases_after_move(self):
        self.seed_event('evt-1', '08:00', '09:00')
        response = self.move('evt-1', start_minutes=minutes('16:00'), expected_version=1)
        self.assertEqual(response.data['event']['version'], 2)

    def test_moving_into_a_full_day_returns_capacity_error(self):
        self.seed_event('evt-1', '08:00', '09:00')
        self.seed_event('wall', '06:00', '23:00', jd=5)
        response = self.move('evt-1', date='1404-05-05', start_minutes=minutes('12:00'))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['error']['code'], 'DAILY_CAPACITY_FULL')
        self.assertEqual(response.data['error']['meta']['date'], '1404/05/05')

    def test_same_day_move_can_always_fall_back_to_its_own_slot(self):
        # روزِ پر، اما فضای خودِ رویداد در دسترس است؛ پس جابه‌جایی سر جای قبلی می‌نشیند.
        self.seed_event('evt-1', '07:00', '08:00')
        self.seed_event('wall', '08:00', '23:00')
        response = self.move('evt-1', start_minutes=minutes('12:00'))
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['event']['start_minutes'], 420)
        self.assertTrue(response.data['snapped'])

    def test_missing_target_is_rejected(self):
        self.seed_event('evt-1', '08:00', '09:00')
        response = self.move('evt-1')
        self.assertEqual(response.status_code, 400)

    def test_unknown_event_returns_not_found(self):
        response = self.move('ghost', start_minutes=600)
        self.assertEqual(response.status_code, 404)
