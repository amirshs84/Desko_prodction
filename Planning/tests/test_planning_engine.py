"""آزمون موتور برنامه‌ریزی گروهی — خالص، بدون دیتابیس و بدون Django.

همان چیزی که سند می‌خواست: منطق تخصیص باید مستقل از تقویم، ORM و UI تست شود.
"""
from __future__ import annotations

from unittest import TestCase

from Planning.intervention.domain.entities.plan_request import PlanRequest
from Planning.intervention.domain.enums import IntensityLevel, PlanWarningCode
from Planning.intervention.domain.services.planning_engine import PlanningEngine
from Planning.intervention.domain.value_objects.break_policy import BreakPolicy
from Planning.intervention.domain.value_objects.plan_window import PlanWindow
from Planning.intervention.domain.value_objects.subject_quota import SubjectQuota
from Planning.intervention.infrastructure.policies import StaticBurnoutPolicy
from Planning.intervention.infrastructure.weights import (
    EqualDistributionWeightCalculator,
    ManualRatioWeightCalculator,
)
from Planning.scheduling.domain.entities.calendar_event import CalendarEvent
from Planning.scheduling.domain.enums import EventKind
from Planning.scheduling.domain.value_objects.event_ref import EventRef
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate
from Planning.scheduling.domain.value_objects.time_range import TimeRange
from Planning.shared.domain.enums import WriteAuthority
from Planning.shared.domain.errors import ValidationError

STUDENT = 11
DAY = JalaliDate(1404, 5, 3)
ONE_DAY = PlanWindow(DAY, DAY)


def fixed_event(client_id: str, start: str, end: str, *, date: JalaliDate = DAY) -> CalendarEvent:
    return CalendarEvent.create(
        ref=EventRef(owner_id=STUDENT, client_id=client_id),
        date=date,
        slot=TimeRange.from_clock(start, end),
        title=client_id,
        kind=EventKind.IMMUTABLE,
        authority=WriteAuthority.SCHOOL_MANAGER,
    )


def engine(*, weights=None, burnout=None) -> PlanningEngine:
    return PlanningEngine(
        weights=weights or EqualDistributionWeightCalculator(),
        burnout=burnout or StaticBurnoutPolicy(max_daily_minutes=None, max_window_minutes=None),
    )


def quotas(**subject_minutes: int) -> tuple[SubjectQuota, ...]:
    return tuple(
        SubjectQuota(subject=subject, minutes=minutes)
        for subject, minutes in subject_minutes.items()
    )


class BreakPolicyTests(TestCase):
    def test_intensity_only_changes_block_and_break(self):
        self.assertEqual(BreakPolicy.for_level(IntensityLevel.LIGHT), BreakPolicy(60, 15))
        self.assertEqual(BreakPolicy.for_level(IntensityLevel.NORMAL), BreakPolicy(90, 15))
        self.assertEqual(BreakPolicy.for_level(IntensityLevel.HEAVY), BreakPolicy(120, 10))


class PlanRequestTests(TestCase):
    def test_rejects_both_input_styles_together(self):
        with self.assertRaises(ValidationError):
            PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=90), subjects=('فیزیک',),
                        total_minutes=90)

    def test_rejects_empty_demand(self):
        with self.assertRaises(ValidationError):
            PlanRequest(window=ONE_DAY)

    def test_rejects_duplicate_subjects(self):
        with self.assertRaises(ValidationError):
            PlanRequest(window=ONE_DAY, subjects=('ریاضی', 'ریاضی'), total_minutes=90)

    def test_window_cannot_be_reversed(self):
        with self.assertRaises(ValidationError):
            PlanWindow(DAY.add_days(2), DAY)


class BasicPlacementTests(TestCase):
    def test_places_requested_blocks_on_an_empty_day(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180))
        preview = engine().plan(request, existing_events={STUDENT: []})
        draft = preview.draft_for(STUDENT)

        self.assertEqual(len(draft.blocks), 2)
        self.assertEqual(draft.allocated_minutes, 180)
        self.assertFalse(draft.has_deadlock)
        self.assertEqual(
            [str(block.slot) for block in draft.blocks], ['06:00–07:30', '07:45–09:15'],
        )

    def test_break_is_inserted_between_blocks(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180))
        blocks = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT).blocks
        gap = blocks[1].slot.start_minutes - blocks[0].slot.end_minutes
        self.assertEqual(gap, 15)

    def test_light_intensity_uses_shorter_blocks(self):
        request = PlanRequest(
            window=ONE_DAY, quotas=quotas(ریاضی=180), intensity=IntensityLevel.LIGHT,
        )
        blocks = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT).blocks
        self.assertEqual([block.minutes for block in blocks], [60, 60, 60])

    def test_heavy_intensity_uses_longer_blocks_and_shorter_breaks(self):
        request = PlanRequest(
            window=ONE_DAY, quotas=quotas(ریاضی=240), intensity=IntensityLevel.HEAVY,
        )
        blocks = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT).blocks
        self.assertEqual([block.minutes for block in blocks], [120, 120])
        self.assertEqual(blocks[1].slot.start_minutes - blocks[0].slot.end_minutes, 10)

    def test_never_places_outside_the_awake_window(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=600))
        blocks = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT).blocks
        self.assertTrue(all(block.slot.start_minutes >= 6 * 60 for block in blocks))
        self.assertTrue(all(block.slot.end_minutes <= 23 * 60 for block in blocks))

    def test_existing_events_are_never_overwritten(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180))
        events = [fixed_event('class', '06:00', '09:00')]
        blocks = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT).blocks
        self.assertTrue(all(block.slot.start_minutes >= 9 * 60 for block in blocks))

    def test_small_remainder_extends_the_last_block(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=100))
        draft = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT)
        self.assertEqual([block.minutes for block in draft.blocks], [100])
        self.assertEqual(draft.shortfall_minutes, 0)

    def test_engine_is_deterministic(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180, فیزیک=90))
        first = engine().plan(request, existing_events={STUDENT: []})
        second = engine().plan(request, existing_events={STUDENT: []})
        self.assertEqual(first.draft_for(STUDENT).blocks, second.draft_for(STUDENT).blocks)


class SubjectBalanceTests(TestCase):
    def test_subjects_are_interleaved_not_stacked(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180, فیزیک=180))
        blocks = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT).blocks
        # در تساویِ کسری، ترتیب الفبایی تصمیم می‌گیرد؛ مهم این است که پشت سر هم
        # روی یک درس تلنبار نشود.
        self.assertEqual(
            [block.subject for block in blocks], ['ریاضی', 'فیزیک', 'ریاضی', 'فیزیک'],
        )

    def test_each_subject_gets_its_exact_quota(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180, فیزیک=90, شیمی=45))
        draft = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT)
        self.assertEqual(draft.allocated_by_subject, {'ریاضی': 180, 'فیزیک': 90, 'شیمی': 45})


class WeightedQuotaTests(TestCase):
    def test_equal_distribution_splits_total_evenly(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(2)),
            subjects=('ریاضی', 'فیزیک'),
            total_minutes=360,
        )
        draft = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT)
        self.assertEqual({q.subject: q.minutes for q in draft.quotas},
                         {'ریاضی': 180, 'فیزیک': 180})

    def test_manual_ratio_respects_consultant_weights(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(2)),
            subjects=('ریاضی', 'فیزیک'),
            total_minutes=600,
        )
        calculator = ManualRatioWeightCalculator({'ریاضی': 3, 'فیزیک': 1})
        draft = engine(weights=calculator).plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)
        self.assertEqual({q.subject: q.minutes for q in draft.quotas},
                         {'ریاضی': 450, 'فیزیک': 150})

    def test_split_keeps_the_exact_total(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(4)),
            subjects=('الف', 'ب', 'ج'),
            total_minutes=100,
        )
        draft = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT)
        self.assertEqual(sum(q.minutes for q in draft.quotas), 100)


class BurnoutTests(TestCase):
    def test_daily_cap_pushes_work_to_the_next_day(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(1)), quotas=quotas(ریاضی=360),
        )
        policy = StaticBurnoutPolicy(max_daily_minutes=180, max_window_minutes=None)
        draft = engine(burnout=policy).plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)

        per_day: dict[str, int] = {}
        for block in draft.blocks:
            per_day[str(block.date)] = per_day.get(str(block.date), 0) + block.minutes
        self.assertEqual(sorted(per_day.values()), [180, 180])

    def test_window_cap_reduces_the_quota_and_warns(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(6)), quotas=quotas(ریاضی=1200),
        )
        policy = StaticBurnoutPolicy(max_daily_minutes=180, max_window_minutes=720)
        draft = engine(burnout=policy).plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)

        self.assertEqual(draft.required_minutes, 720)
        self.assertEqual(draft.allocated_minutes, 720)
        codes = [warning.code for warning in draft.warnings]
        self.assertIn(PlanWarningCode.BURNOUT_CAP, codes)


class DeadlockTests(TestCase):
    def test_reports_shortfall_when_capacity_is_not_enough(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=600))
        events = [fixed_event('class', '06:00', '20:00')]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)

        # پنجره‌ی خالی ۲۰:۰۰ تا ۲۳:۰۰ است؛ با یک استراحت ۱۵ دقیقه‌ای، ۱۶۵ دقیقه‌ی
        # آن واقعاً قابل استفاده است — ظرفیت گزارش‌شده همان عدد قابل استفاده است.
        self.assertTrue(draft.has_deadlock)
        self.assertEqual(draft.capacity_minutes, 165)
        self.assertEqual(draft.allocated_minutes, 165)
        self.assertEqual(draft.shortfall_minutes, 435)
        warning = next(
            w for w in draft.warnings if w.code == PlanWarningCode.CAPACITY_SHORTFALL
        )
        self.assertEqual(warning.meta['shortfall_minutes'], 435)
        self.assertIn('7 ساعت و 15 دقیقه', warning.message)

    def test_reports_per_subject_shortfall(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180, فیزیک=180))
        events = [fixed_event('class', '06:00', '21:00')]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)
        subjects = {
            warning.meta['subject']
            for warning in draft.warnings
            if warning.code == PlanWarningCode.SUBJECT_SHORTFALL
        }
        self.assertTrue(subjects.issubset({'ریاضی', 'فیزیک'}))
        self.assertTrue(draft.shortfall_by_subject())

    def test_completely_full_day_reports_no_free_space(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=90))
        events = [fixed_event('class', '06:00', '23:00')]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)
        self.assertEqual(draft.blocks, ())
        self.assertEqual(draft.capacity_minutes, 0)
        self.assertIn(
            PlanWarningCode.NO_FREE_SPACE, [warning.code for warning in draft.warnings],
        )

    def test_only_blocked_students_are_flagged(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180))
        busy_student = 12
        preview = engine().plan(request, existing_events={
            STUDENT: [],
            busy_student: [
                CalendarEvent.create(
                    ref=EventRef(owner_id=busy_student, client_id='class'),
                    date=DAY,
                    slot=TimeRange.from_clock('06:00', '22:00'),
                    title='کلاس',
                    kind=EventKind.IMMUTABLE,
                    authority=WriteAuthority.SCHOOL_MANAGER,
                )
            ],
        })
        self.assertTrue(preview.has_deadlock)
        self.assertEqual([d.student_id for d in preview.blocked_students], [busy_student])
        self.assertFalse(preview.draft_for(STUDENT).has_deadlock)


class MultiDayTests(TestCase):
    def test_work_spreads_across_the_window(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(2)), quotas=quotas(ریاضی=270),
        )
        policy = StaticBurnoutPolicy(max_daily_minutes=90, max_window_minutes=None)
        draft = engine(burnout=policy).plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)
        self.assertEqual(len({str(block.date) for block in draft.blocks}), 3)

    def test_events_of_other_days_do_not_leak(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=90))
        events = [fixed_event('class', '06:00', '23:00', date=DAY.add_days(1))]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)
        self.assertEqual(len(draft.blocks), 1)
        self.assertEqual(draft.blocks[0].date, DAY)
