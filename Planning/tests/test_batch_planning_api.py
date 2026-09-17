"""آزمون انتها‌به‌انتهای برنامه‌ریزی گروهی: پیش‌نمایش، انتشار، پیشنهاد و اسنپ‌شات."""
from __future__ import annotations

from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from api.models import School, UserProfile

from Planning.models import (
    CalendarEventModel,
    CalendarSnapshotModel,
    PlanProposalModel,
    PlanRunModel,
    StudentGroupMemberModel,
    StudentGroupModel,
)
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate

PREVIEW_URL = '/api/planning/consultant/plans/preview/'
PUBLISH_URL = '/api/planning/consultant/plans/publish/'
RUNS_URL = '/api/planning/consultant/plans/'
PROPOSALS_URL = '/api/planning/me/proposals/'
SNAPSHOTS_URL = '/api/planning/calendar/snapshots/'
DAY = '1404-05-03'


class BatchPlanningApiTests(APITestCase):
    def setUp(self) -> None:
        self.school = School.objects.create(name='دبیرستان الف', invitation_code='ALEF1234')
        self.other_school = School.objects.create(name='دبیرستان ب', invitation_code='BE123456')
        self.consultant = self.make_user('09120000100', role='consultant', school=self.school)
        self.peer = self.make_user('09120000101', role='consultant', school=self.school)
        self.ali = self.make_user('09120000201', school=self.school, full_name='علی احمدی')
        self.sara = self.make_user('09120000202', school=self.school, full_name='سارا کریمی')
        self.outsider = self.make_user('09120000203', school=self.other_school, full_name='غریبه')

        self.group = StudentGroupModel.objects.create(
            school=self.school, consultant=self.consultant, name='گروه ریاضی',
        )
        StudentGroupMemberModel.objects.create(group=self.group, student=self.ali)
        StudentGroupMemberModel.objects.create(group=self.group, student=self.sara)
        self.authenticate(self.consultant)

    def make_user(
        self, phone: str, *, role: str = 'student', school: School | None = None,
        full_name: str = '',
    ) -> User:
        user = User.objects.create(username=phone)
        UserProfile.objects.create(
            user=user, phone_number=phone, role=role, school=school, full_name=full_name,
        )
        return user

    def authenticate(self, user: User) -> None:
        token = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token.access_token}')

    def seed_busy(self, user: User, start: str, end: str, *, kind: str = 'immutable', jd: int = 3):
        day = JalaliDate(1404, 5, jd)
        hours, mins = start.split(':')
        end_h, end_m = end.split(':')
        return CalendarEventModel.objects.create(
            user=user,
            client_id=f'{user.id}-{start}-{kind}',
            group_id='',
            jy=day.jy, jm=day.jm, jd=day.jd,
            date=day.to_gregorian(),
            title='کلاس',
            description='',
            start_minutes=int(hours) * 60 + int(mins),
            end_minutes=int(end_h) * 60 + int(end_m),
            color='#999',
            all_day=False,
            kind=kind,
            origin='school' if kind == 'immutable' else 'student',
        )

    def plan_body(self, **overrides) -> dict:
        body = {
            'group_id': self.group.id,
            'start': DAY,
            'end': DAY,
            'intensity': 'normal',
            'quotas': [{'subject': 'ریاضی', 'minutes': 90}],
            'mode': 'suggested',
        }
        body.update(overrides)
        return body


class PreviewTests(BatchPlanningApiTests):
    def test_preview_does_not_write_anything(self):
        response = self.client.post(PREVIEW_URL, self.plan_body(), format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total_blocks'], 2)
        self.assertFalse(response.data['has_deadlock'])
        self.assertEqual(CalendarEventModel.objects.count(), 0)
        self.assertEqual(PlanRunModel.objects.count(), 0)
        self.assertEqual(PlanProposalModel.objects.count(), 0)
        self.assertEqual(CalendarSnapshotModel.objects.count(), 0)

    def test_preview_reports_deadlock_when_day_is_full(self):
        self.seed_busy(self.ali, '06:00', '23:00')
        response = self.client.post(PREVIEW_URL, self.plan_body(), format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['has_deadlock'])
        self.assertIn(self.ali.id, response.data['blocked_student_ids'])
        ali = next(s for s in response.data['students'] if s['student_id'] == self.ali.id)
        self.assertTrue(ali['has_deadlock'])
        self.assertEqual(ali['shortfall_minutes'], 90)
        codes = {w['code'] for w in ali['warnings']}
        self.assertIn('CAPACITY_SHORTFALL', codes)
        self.assertIn('NO_FREE_SPACE', codes)

    def test_weighted_subjects_split_total_minutes(self):
        response = self.client.post(
            PREVIEW_URL,
            self.plan_body(
                quotas=[],
                subjects=['ریاضی', 'فیزیک'],
                total_minutes=180,
                ratios={'ریاضی': 2, 'فیزیک': 1},
            ),
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        quotas = {
            item['subject']: item['minutes']
            for item in response.data['students'][0]['quotas']
        }
        self.assertEqual(quotas['ریاضی'], 120)
        self.assertEqual(quotas['فیزیک'], 60)

    def test_student_cannot_preview(self):
        self.authenticate(self.ali)
        self.assertEqual(
            self.client.post(PREVIEW_URL, self.plan_body(), format='json').status_code, 403,
        )


class PublishTests(BatchPlanningApiTests):
    def test_forced_publish_writes_events_and_takes_snapshots(self):
        response = self.client.post(
            PUBLISH_URL, self.plan_body(mode='forced'), format='json',
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['mode'], 'forced')
        self.assertEqual(response.data['created_events'], 2)
        self.assertEqual(response.data['snapshots_taken'], 2)
        self.assertEqual(CalendarEventModel.objects.count(), 2)
        self.assertEqual(CalendarSnapshotModel.objects.count(), 2)
        self.assertTrue(
            all(event.origin == 'algorithm' for event in CalendarEventModel.objects.all())
        )
        self.assertTrue(
            all(proposal['status'] == 'accepted' for proposal in response.data['proposals'])
        )

    def test_forced_publish_never_overwrites_existing_events(self):
        self.seed_busy(self.ali, '06:00', '07:30', kind='mutable')
        before = list(
            CalendarEventModel.objects.filter(user=self.ali)
            .values_list('client_id', 'start_minutes', 'end_minutes')
        )
        body = self.plan_body(mode='forced', student_ids=[self.ali.id])
        del body['group_id']
        response = self.client.post(PUBLISH_URL, body, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        after = list(
            CalendarEventModel.objects.filter(user=self.ali)
            .values_list('client_id', 'start_minutes', 'end_minutes')
        )
        for row in before:
            self.assertIn(row, after)
        new_events = CalendarEventModel.objects.filter(user=self.ali, origin='algorithm')
        self.assertEqual(new_events.count(), 1)
        self.assertGreaterEqual(new_events.first().start_minutes, 450)

    def test_suggested_publish_creates_pending_proposals_without_events(self):
        response = self.client.post(PUBLISH_URL, self.plan_body(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['created_events'], 0)
        self.assertEqual(response.data['snapshots_taken'], 0)
        self.assertEqual(CalendarEventModel.objects.count(), 0)
        self.assertEqual(PlanProposalModel.objects.filter(status='pending').count(), 2)

    def test_peer_consultant_cannot_see_run(self):
        published = self.client.post(PUBLISH_URL, self.plan_body(), format='json')
        self.authenticate(self.peer)
        response = self.client.get(f'{RUNS_URL}{published.data["id"]}/')
        self.assertEqual(response.status_code, 404)

    def test_list_runs_returns_own_history(self):
        self.client.post(PUBLISH_URL, self.plan_body(), format='json')
        response = self.client.get(RUNS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['pending_count'], 2)


class ProposalInboxTests(BatchPlanningApiTests):
    def publish_suggested(self) -> dict:
        response = self.client.post(PUBLISH_URL, self.plan_body(), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_student_sees_only_own_pending_proposal(self):
        self.publish_suggested()
        self.authenticate(self.ali)
        response = self.client.get(f'{PROPOSALS_URL}?pending=true')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['status'], 'pending')
        self.assertEqual(response.data[0]['block_count'], 1)

    def test_accept_applies_blocks_and_takes_snapshot(self):
        run = self.publish_suggested()
        proposal_id = next(
            p['id'] for p in run['proposals'] if p['student_id'] == self.ali.id
        )
        self.authenticate(self.ali)
        response = self.client.post(
            f'{PROPOSALS_URL}{proposal_id}/respond/', {'accept': True}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['accepted'])
        self.assertEqual(response.data['applied_blocks'], 1)
        self.assertEqual(CalendarEventModel.objects.filter(user=self.ali).count(), 1)
        self.assertEqual(CalendarSnapshotModel.objects.filter(user=self.ali).count(), 1)
        self.assertEqual(
            PlanProposalModel.objects.get(id=proposal_id).status, 'accepted',
        )

    def test_reject_leaves_calendar_untouched(self):
        run = self.publish_suggested()
        proposal_id = next(
            p['id'] for p in run['proposals'] if p['student_id'] == self.ali.id
        )
        self.authenticate(self.ali)
        response = self.client.post(
            f'{PROPOSALS_URL}{proposal_id}/respond/', {'accept': False}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data['accepted'])
        self.assertEqual(CalendarEventModel.objects.count(), 0)
        self.assertEqual(CalendarSnapshotModel.objects.count(), 0)

    def test_double_accept_is_rejected(self):
        run = self.publish_suggested()
        proposal_id = next(
            p['id'] for p in run['proposals'] if p['student_id'] == self.ali.id
        )
        self.authenticate(self.ali)
        self.client.post(
            f'{PROPOSALS_URL}{proposal_id}/respond/', {'accept': True}, format='json',
        )
        again = self.client.post(
            f'{PROPOSALS_URL}{proposal_id}/respond/', {'accept': True}, format='json',
        )
        self.assertEqual(again.status_code, 409)
        self.assertEqual(CalendarEventModel.objects.filter(user=self.ali).count(), 1)

    def test_accept_skips_blocks_when_day_became_full(self):
        run = self.publish_suggested()
        proposal_id = next(
            p['id'] for p in run['proposals'] if p['student_id'] == self.ali.id
        )
        self.seed_busy(self.ali, '06:00', '23:00', kind='mutable')
        self.authenticate(self.ali)
        response = self.client.post(
            f'{PROPOSALS_URL}{proposal_id}/respond/', {'accept': True}, format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['applied_blocks'], 0)
        self.assertEqual(response.data['skipped_blocks'], 1)
        self.assertEqual(
            CalendarEventModel.objects.filter(user=self.ali, origin='algorithm').count(), 0,
        )


class SnapshotTests(BatchPlanningApiTests):
    def test_forced_publish_keeps_only_ten_snapshots(self):
        body = self.plan_body(
            mode='forced', student_ids=[self.ali.id],
            quotas=[{'subject': 'ریاضی', 'minutes': 30}],
        )
        del body['group_id']
        for _ in range(11):
            CalendarEventModel.objects.filter(user=self.ali, origin='algorithm').delete()
            response = self.client.post(PUBLISH_URL, body, format='json')
            self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(CalendarSnapshotModel.objects.filter(user=self.ali).count(), 10)

    def test_restore_undoes_forced_plan_and_keeps_immutable(self):
        # اسنپ‌شاتِ انتشار «قبل از اعمال برنامه» گرفته می‌شود تا بازگردانی همان
        # انتشار را خنثی کند، نه اینکه برنامه‌ی تازه را دوباره بنشاند.
        self.seed_busy(self.ali, '08:00', '09:00', kind='immutable')
        body = self.plan_body(mode='forced', student_ids=[self.ali.id])
        del body['group_id']
        published = self.client.post(PUBLISH_URL, body, format='json')
        self.assertEqual(published.status_code, 201, published.data)
        self.assertEqual(
            CalendarEventModel.objects.filter(user=self.ali, origin='algorithm').count(), 1,
        )
        publish_snapshot = CalendarSnapshotModel.objects.filter(
            user=self.ali, reason='plan_publish',
        ).first()

        # بعد از انتشار یک رویداد دستی هم اضافه می‌شود؛ بازگردانی باید آن را هم پاک کند.
        self.seed_busy(self.ali, '16:00', '17:00', kind='mutable')

        response = self.client.post(
            f'{SNAPSHOTS_URL}{publish_snapshot.id}/restore/?user={self.ali.id}',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['restored_events'], 0)
        self.assertTrue(
            CalendarEventModel.objects.filter(user=self.ali, kind='immutable').exists()
        )
        self.assertEqual(
            CalendarEventModel.objects.filter(user=self.ali, kind='mutable').count(), 0,
        )
        self.assertGreaterEqual(
            CalendarSnapshotModel.objects.filter(user=self.ali).count(), 2,
        )

    def test_restore_brings_back_preexisting_mutable_events(self):
        preexisting = self.seed_busy(self.ali, '20:00', '21:00', kind='mutable')
        body = self.plan_body(mode='forced', student_ids=[self.ali.id])
        del body['group_id']
        self.client.post(PUBLISH_URL, body, format='json')
        publish_snapshot = CalendarSnapshotModel.objects.filter(
            user=self.ali, reason='plan_publish',
        ).first()

        CalendarEventModel.objects.filter(user=self.ali, kind='mutable').delete()
        response = self.client.post(
            f'{SNAPSHOTS_URL}{publish_snapshot.id}/restore/?user={self.ali.id}',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['restored_events'], 1)
        self.assertTrue(
            CalendarEventModel.objects.filter(
                user=self.ali, client_id=preexisting.client_id,
            ).exists()
        )
        self.assertEqual(
            CalendarEventModel.objects.filter(user=self.ali, origin='algorithm').count(), 0,
        )

    def test_student_lists_own_snapshots(self):
        body = self.plan_body(mode='forced', student_ids=[self.ali.id])
        del body['group_id']
        self.client.post(PUBLISH_URL, body, format='json')
        self.authenticate(self.ali)
        response = self.client.get(SNAPSHOTS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['reason'], 'plan_publish')


class ProposalBlockAndNoticeTests(BatchPlanningApiTests):
    def publish_suggested(self, **overrides) -> dict:
        response = self.client.post(PUBLISH_URL, self.plan_body(**overrides), format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_publish_stores_custom_and_generated_goal_message(self):
        custom = self.publish_suggested(goal_message='هدف این هفته ما: افزایش ۳۰ درصدی تست‌های فیزیک است. آماده‌ای؟')
        self.assertIn('فیزیک', custom['summary']['goal_message'])
        auto = self.publish_suggested()
        self.assertIn('ریاضی', auto['summary']['goal_message'])
        self.assertIn('آماده‌ای؟', auto['summary']['goal_message'])

    def test_student_sees_goal_and_can_ack_notice(self):
        self.publish_suggested(goal_message='هدف آزمایشی هفته')
        self.authenticate(self.ali)
        inbox = self.client.get(PROPOSALS_URL)
        self.assertEqual(inbox.status_code, 200)
        self.assertEqual(inbox.data[0]['goal_message'], 'هدف آزمایشی هفته')
        self.assertIsNone(inbox.data[0]['notice_seen_at'])
        proposal_id = inbox.data[0]['id']
        ack = self.client.post(f'{PROPOSALS_URL}{proposal_id}/notice/', {}, format='json')
        self.assertEqual(ack.status_code, 200, ack.data)
        self.assertIsNotNone(ack.data['notice_seen_at'])

    def test_accept_single_block_creates_event(self):
        run = self.publish_suggested()
        proposal_id = next(
            p['id'] for p in run['proposals'] if p['student_id'] == self.ali.id
        )
        self.authenticate(self.ali)
        response = self.client.post(
            f'{PROPOSALS_URL}{proposal_id}/blocks/respond/',
            {'block_index': 0, 'accept': True},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['accepted'])
        self.assertTrue(response.data['applied'])
        self.assertEqual(response.data['status'], 'accepted')
        self.assertEqual(CalendarEventModel.objects.filter(user=self.ali).count(), 1)
        self.assertIn('event', response.data)

    def test_reject_block_with_reason_sends_message(self):
        from Planning.models import ConsultantDirectMessageModel

        run = self.publish_suggested()
        proposal_id = next(
            p['id'] for p in run['proposals'] if p['student_id'] == self.ali.id
        )
        self.authenticate(self.ali)
        response = self.client.post(
            f'{PROPOSALS_URL}{proposal_id}/blocks/respond/',
            {'block_index': 0, 'accept': False, 'reason': 'این ساعت کلاس دارم'},
            format='json',
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertFalse(response.data['accepted'])
        self.assertTrue(response.data['reason_sent'])
        self.assertEqual(CalendarEventModel.objects.count(), 0)
        self.assertEqual(
            ConsultantDirectMessageModel.objects.filter(
                student=self.ali, consultant=self.consultant,
            ).count(),
            1,
        )
        self.assertIn(
            'کلاس',
            ConsultantDirectMessageModel.objects.get(student=self.ali).body,
        )
