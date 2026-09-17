"""آزمون موتور برنامه‌ریزی گروهی — خالص، بدون دیتابیس و بدون Django.

همان چیزی که سند می‌خواست: منطق تخصیص باید مستقل از تقویم، ORM و UI تست شود.

این تست‌ها عمداً **موقعیت دقیق** بلوک‌ها را ادعا نمی‌کنند. موتور یک بهینه‌ساز است و
جای دقیق هر بلوک با هر تغییرِ وزن‌های تابع هزینه عوض می‌شود؛ تستی که «۰۸:۰۰» را
قفل کند، فردا به‌خاطر یک بهبود واقعی قرمز می‌شود. در عوض **ناوردا** ادعا می‌شود:
عدم تداخل، داخل بازه‌ی فعال بودن، رعایت حداقل استراحت، رسیدن به سهمیه، احترام به
اولویت، و دترمینیسم.
"""
from __future__ import annotations

from unittest import TestCase

from Planning.intervention.domain.entities.plan_request import PlanRequest
from Planning.intervention.domain.enums import (
    ActivityKind,
    IntensityLevel,
    PlanWarningCode,
)
from Planning.intervention.domain.ports.workload_estimator import WorkloadEstimate
from Planning.intervention.domain.services.planning_engine import PlanningEngine
from Planning.intervention.domain.value_objects.intensity_profile import (
    BlockShape,
    IntensityProfile,
)
from Planning.intervention.domain.value_objects.plan_window import PlanWindow
from Planning.intervention.domain.value_objects.subject_demand import SubjectDemand
from Planning.intervention.domain.value_objects.subject_profile import SubjectProfile
from Planning.intervention.domain.value_objects.subject_quota import SubjectQuota
from Planning.intervention.domain.value_objects.subject_tag import SubjectTag
from Planning.intervention.infrastructure.policies import StaticBurnoutPolicy
from Planning.intervention.infrastructure.weights import (
    EqualDistributionWeightCalculator,
    ManualRatioWeightCalculator,
)
from Planning.scheduling.domain.entities.calendar_event import CalendarEvent
from Planning.scheduling.domain.enums import EventKind
from Planning.scheduling.domain.services.awake_window_policy import AwakeWindowPolicy
from Planning.scheduling.domain.value_objects.event_ref import EventRef
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate
from Planning.scheduling.domain.value_objects.time_range import TimeRange
from Planning.shared.domain.enums import WriteAuthority
from Planning.shared.domain.errors import ValidationError

STUDENT = 11
DAY = JalaliDate(1404, 5, 3)
ONE_DAY = PlanWindow(DAY, DAY)
DEFAULT_WINDOW = AwakeWindowPolicy.default().window


# ---------- ابزار ساخت ----------

def fixed_event(client_id: str, start: str, end: str, *, date: JalaliDate = DAY) -> CalendarEvent:
    return CalendarEvent.create(
        ref=EventRef(owner_id=STUDENT, client_id=client_id),
        date=date,
        slot=TimeRange.from_clock(start, end),
        title=client_id,
        kind=EventKind.IMMUTABLE,
        authority=WriteAuthority.SCHOOL_MANAGER,
    )


def algorithm_block(
    client_id: str,
    start: str,
    end: str,
    *,
    date: JalaliDate = DAY,
    priority: int = 2,
    movability: int = 3,
    title: str = 'مرور',
) -> CalendarEvent:
    """بلوکی که موتور در یک اجرای قبلی گذاشته — تنها جنسی که قابل جابه‌جایی است."""
    return CalendarEvent.create(
        ref=EventRef(owner_id=STUDENT, client_id=client_id),
        date=date,
        slot=TimeRange.from_clock(start, end),
        title=title,
        kind=EventKind.MUTABLE,
        authority=WriteAuthority.ALGORITHM,
        priority=priority,
        movability=movability,
    )


class FakeCatalog:
    def __init__(self, **tags_by_subject: tuple[SubjectTag, ...]) -> None:
        self._tags = tags_by_subject

    def profiles_for(self, *, school_id, names):
        return {
            name: SubjectProfile(name=name, tags=frozenset(self._tags.get(name, ())))
            for name in names
        }


class FakeWorkloadEstimator:
    """نرخ ثابت، تا تست بتواند «۱۰۰ تست → چند دقیقه» را قطعی ادعا کند."""

    def __init__(self, minutes_per_unit: float = 1.5, confidence: float = 0.9) -> None:
        self.minutes_per_unit = minutes_per_unit
        self.confidence = confidence
        self.calls: list[dict] = []

    def estimate(self, *, student_id, subject, activity, units, school_id=None):
        self.calls.append({'student_id': student_id, 'subject': subject, 'units': units})
        return WorkloadEstimate(
            minutes=round(self.minutes_per_unit * units),
            confidence=self.confidence,
            minutes_per_unit=self.minutes_per_unit,
            observed_units=units,
        )


def engine(*, weights=None, burnout=None, catalog=None, workload=None) -> PlanningEngine:
    return PlanningEngine(
        weights=weights or EqualDistributionWeightCalculator(),
        burnout=burnout or StaticBurnoutPolicy(max_daily_minutes=None, max_window_minutes=None),
        catalog=catalog,
        workload=workload,
    )


def quotas(**subject_minutes: int) -> tuple[SubjectQuota, ...]:
    return tuple(
        SubjectQuota(subject=subject, minutes=minutes)
        for subject, minutes in subject_minutes.items()
    )


# ---------- ناوردا ----------

class InvariantAssertions:
    """ادعاهایی که برای *هر* خروجی معتبر موتور باید برقرار باشند."""

    def assert_valid_schedule(
        self, draft, *, walls=(), window=DEFAULT_WINDOW,
    ) -> None:
        by_date: dict[str, list] = {}
        for block in draft.blocks:
            by_date.setdefault(str(block.date), []).append(block)

        for blocks in by_date.values():
            blocks.sort(key=lambda item: item.slot.start_minutes)
            for index, block in enumerate(blocks):
                self.assertGreaterEqual(  # type: ignore[attr-defined]
                    block.slot.start_minutes, window.start_minutes,
                    f'بلوک {block} پیش از شروع بازه‌ی فعال است.',
                )
                self.assertLessEqual(  # type: ignore[attr-defined]
                    block.slot.end_minutes, window.end_minutes,
                    f'بلوک {block} بعد از پایان بازه‌ی فعال است.',
                )
                if index:
                    previous = blocks[index - 1]
                    self.assertGreaterEqual(  # type: ignore[attr-defined]
                        block.slot.start_minutes, previous.slot.end_minutes,
                        f'بلوک {block} با {previous} تداخل دارد.',
                    )

        for wall in walls:
            for block in draft.blocks:
                if block.date != wall.date:
                    continue
                self.assertFalse(  # type: ignore[attr-defined]
                    block.slot.overlaps(wall.slot),
                    f'بلوک {block} روی رویداد موجود {wall.title} افتاده است.',
                )

    def assert_min_break_respected(self, draft) -> None:
        by_date: dict[str, list] = {}
        for block in draft.blocks:
            by_date.setdefault(str(block.date), []).append(block)
        for blocks in by_date.values():
            blocks.sort(key=lambda item: item.slot.start_minutes)
            for previous, current in zip(blocks, blocks[1:]):
                gap = current.slot.start_minutes - previous.slot.end_minutes
                self.assertGreater(  # type: ignore[attr-defined]
                    gap, 0, 'بین دو بلوک هیچ استراحتی نیست.',
                )


# ---------- بازه‌ی فعال ----------

class AwakeWindowPolicyTests(TestCase):
    def test_default_window_is_seven_to_eleven_pm(self):
        policy = AwakeWindowPolicy.default()
        self.assertEqual(policy.window.start_minutes, 7 * 60)
        self.assertEqual(policy.window.end_minutes, 23 * 60)
        self.assertTrue(policy.is_default)

    def test_student_can_widen_the_window(self):
        policy = AwakeWindowPolicy.from_clock('05:30', '23:30')
        self.assertEqual(policy.capacity_minutes, 18 * 60)
        self.assertFalse(policy.is_default)

    def test_rejects_a_window_shorter_than_the_minimum(self):
        with self.assertRaises(ValidationError):
            AwakeWindowPolicy.from_clock('09:00', '11:00')

    def test_rejects_a_reversed_window(self):
        with self.assertRaises(ValidationError):
            AwakeWindowPolicy.from_minutes(23 * 60, 7 * 60)


class PerStudentWindowTests(TestCase, InvariantAssertions):
    def test_each_student_is_planned_inside_their_own_window(self):
        night_owl = 12
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180))
        preview = engine().plan(
            request,
            existing_events={STUDENT: [], night_owl: []},
            awake_windows={night_owl: AwakeWindowPolicy.from_clock('14:00', '23:00')},
        )
        owl_draft = preview.draft_for(night_owl)
        self.assert_valid_schedule(
            owl_draft, window=TimeRange.from_clock('14:00', '23:00'),
        )
        self.assertTrue(
            all(block.slot.start_minutes >= 14 * 60 for block in owl_draft.blocks)
        )
        self.assert_valid_schedule(preview.draft_for(STUDENT))

    def test_a_narrow_window_shrinks_capacity(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=600))
        narrow = engine().plan(
            request,
            existing_events={STUDENT: []},
            awake_windows={STUDENT: AwakeWindowPolicy.from_clock('08:00', '13:00')},
        ).draft_for(STUDENT)
        wide = engine().plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)
        self.assertLess(narrow.capacity_minutes, wide.capacity_minutes)
        self.assertGreater(narrow.shortfall_minutes, 0)


# ---------- فشردگی و تگ ----------

class IntensityProfileTests(TestCase):
    def test_untagged_subjects_keep_the_classic_shape(self):
        self.assertEqual(
            IntensityProfile.for_level(IntensityLevel.LIGHT).shape_for(),
            BlockShape(60, 15),
        )
        self.assertEqual(
            IntensityProfile.for_level(IntensityLevel.NORMAL).shape_for(),
            BlockShape(90, 15),
        )
        self.assertEqual(
            IntensityProfile.for_level(IntensityLevel.HEAVY).shape_for(),
            BlockShape(120, 10),
        )

    def test_memorization_gets_shorter_blocks_than_analytical(self):
        profile = IntensityProfile.for_level(IntensityLevel.NORMAL)
        analytical = profile.shape_for(frozenset({SubjectTag.ANALYTICAL}))
        memorization = profile.shape_for(frozenset({SubjectTag.MEMORIZATION}))
        self.assertLess(memorization.study_minutes, analytical.study_minutes)
        self.assertGreater(analytical.break_minutes, memorization.break_minutes)

    def test_analytical_wins_when_a_subject_carries_both_tags(self):
        profile = IntensityProfile.for_level(IntensityLevel.NORMAL)
        both = profile.shape_for(
            frozenset({SubjectTag.ANALYTICAL, SubjectTag.MEMORIZATION})
        )
        self.assertEqual(both, profile.shape_for(frozenset({SubjectTag.ANALYTICAL})))


class SubjectTagPlacementTests(TestCase, InvariantAssertions):
    def test_tags_change_block_length(self):
        catalog = FakeCatalog(زیست=(SubjectTag.MEMORIZATION,))
        request = PlanRequest(window=ONE_DAY, quotas=quotas(زیست=180))
        draft = engine(catalog=catalog).plan(
            request, existing_events={STUDENT: []}, school_id=1,
        ).draft_for(STUDENT)

        self.assertTrue(all(block.minutes <= 45 for block in draft.blocks))
        self.assertEqual(draft.allocated_minutes, 180)
        self.assert_valid_schedule(draft)

    def test_two_heavy_analytical_blocks_are_not_glued_together(self):
        catalog = FakeCatalog(
            ریاضی=(SubjectTag.ANALYTICAL,), فیزیک=(SubjectTag.ANALYTICAL,),
        )
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180, فیزیک=180))
        draft = engine(catalog=catalog).plan(
            request, existing_events={STUDENT: []}, school_id=1,
        ).draft_for(STUDENT)

        blocks = sorted(draft.blocks, key=lambda block: block.slot.start_minutes)
        for previous, current in zip(blocks, blocks[1:]):
            gap = current.slot.start_minutes - previous.slot.end_minutes
            self.assertGreaterEqual(
                gap, 20,
                'دو بلوک تحلیلی سنگین بدون استراحت کافی پشت سر هم نشسته‌اند.',
            )

    def test_heavy_work_lands_in_high_alertness_hours(self):
        catalog = FakeCatalog(ریاضی=(SubjectTag.ANALYTICAL,))
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=90))
        draft = engine(catalog=catalog).plan(
            request, existing_events={STUDENT: []}, school_id=1,
        ).draft_for(STUDENT)
        self.assertLess(draft.blocks[0].slot.start_minutes, 12 * 60)


# ---------- اولویت و شناوری ----------

class PriorityTests(TestCase, InvariantAssertions):
    def test_high_priority_survives_when_capacity_is_scarce(self):
        request = PlanRequest(
            window=ONE_DAY,
            demands=(
                SubjectDemand.of_minutes('آزمون', 180, priority=5),
                SubjectDemand.of_minutes('مرور جزئی', 180, priority=1),
            ),
        )
        events = [fixed_event('class', '07:00', '20:00')]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)

        allocated = dict(draft.allocated_by_subject)
        self.assertGreater(allocated.get('آزمون', 0), allocated.get('مرور جزئی', 0))
        self.assert_valid_schedule(draft, walls=events)

    def test_a_low_priority_block_is_pushed_aside_for_a_critical_one(self):
        """بلوک الگوریتمی قبلی که سر راه است باید جابه‌جا شود، نه حذف."""
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(1)),
            demands=(SubjectDemand.of_minutes('آزمون', 480, priority=5),),
        )
        existing = [
            algorithm_block('old-1', '08:00', '09:00', priority=1, movability=4),
            fixed_event('class', '10:00', '20:00'),
        ]
        draft = engine().plan(
            request, existing_events={STUDENT: existing},
        ).draft_for(STUDENT)
        self.assert_valid_schedule(draft, walls=[existing[1]])
        # چه جابه‌جا شده باشد چه نه، حق ندارد ناپدید شود یا زیر بلوک تازه بماند.
        for move in draft.relocations:
            self.assertEqual(move.client_id, 'old-1')
            self.assertNotEqual(
                (move.date, move.slot), (move.from_date, move.from_slot),
            )

    def test_a_pinned_block_is_never_moved(self):
        request = PlanRequest(
            window=ONE_DAY,
            demands=(SubjectDemand.of_minutes('آزمون', 600, priority=5),),
        )
        existing = [algorithm_block('pinned', '09:00', '10:30', priority=1, movability=0)]
        draft = engine().plan(
            request, existing_events={STUDENT: existing},
        ).draft_for(STUDENT)

        self.assertEqual(draft.relocations, ())
        for block in draft.blocks:
            self.assertFalse(block.slot.overlaps(existing[0].slot))

    def test_manual_events_are_walls_even_when_mutable(self):
        """رویدادی که خود دانش‌آموز ساخته، حتی اگر MUTABLE باشد جابه‌جا نمی‌شود."""
        personal = CalendarEvent.create(
            ref=EventRef(owner_id=STUDENT, client_id='gym'),
            date=DAY,
            slot=TimeRange.from_clock('17:00', '19:00'),
            title='باشگاه',
            kind=EventKind.MUTABLE,
            authority=WriteAuthority.STUDENT,
        )
        request = PlanRequest(
            window=ONE_DAY,
            demands=(SubjectDemand.of_minutes('آزمون', 600, priority=5),),
        )
        draft = engine().plan(
            request, existing_events={STUDENT: [personal]},
        ).draft_for(STUDENT)

        self.assertEqual(draft.relocations, ())
        self.assert_valid_schedule(draft, walls=[personal])


# ---------- تقاضای واحدمحور ----------

class UnitDemandTests(TestCase, InvariantAssertions):
    def test_test_count_is_converted_to_minutes(self):
        estimator = FakeWorkloadEstimator(minutes_per_unit=1.5)
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(1)),
            demands=(SubjectDemand.of_count('ریاضی', 100, activity=ActivityKind.TEST),),
        )
        draft = engine(workload=estimator).plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)

        self.assertEqual(draft.required_minutes, 150)
        self.assertEqual(draft.quotas[0].requested_units, 100)
        self.assertEqual(estimator.calls[0]['units'], 100)
        self.assert_valid_schedule(draft)

    def test_low_confidence_estimates_warn_the_consultant(self):
        estimator = FakeWorkloadEstimator(minutes_per_unit=2.0, confidence=0.1)
        request = PlanRequest(
            window=ONE_DAY,
            demands=(SubjectDemand.of_count('ریاضی', 50),),
        )
        draft = engine(workload=estimator).plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)
        self.assertIn(
            PlanWarningCode.LOW_CONFIDENCE_ESTIMATE,
            [warning.code for warning in draft.warnings],
        )

    def test_count_is_rejected_for_activities_where_it_is_meaningless(self):
        with self.assertRaises(ValidationError):
            SubjectDemand.of_count('ریاضی', 100, activity=ActivityKind.STUDY)


# ---------- ورودی ----------

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

    def test_legacy_quotas_are_translated_to_demands(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=90))
        self.assertEqual(len(request.demands), 1)
        self.assertEqual(request.demands[0].subject, 'ریاضی')
        self.assertEqual(request.demands[0].amount, 90)

    def test_window_cannot_be_reversed(self):
        with self.assertRaises(ValidationError):
            PlanWindow(DAY.add_days(2), DAY)


# ---------- چیدمان پایه ----------

class BasicPlacementTests(TestCase, InvariantAssertions):
    def test_places_requested_work_on_an_empty_day(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180))
        draft = engine().plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)

        self.assertEqual(draft.allocated_minutes, 180)
        self.assertFalse(draft.has_deadlock)
        self.assertTrue(all(block.date == DAY for block in draft.blocks))
        self.assert_valid_schedule(draft)
        self.assert_min_break_respected(draft)

    def test_light_intensity_uses_shorter_blocks_than_heavy(self):
        request_light = PlanRequest(
            window=ONE_DAY, quotas=quotas(ریاضی=240), intensity=IntensityLevel.LIGHT,
        )
        request_heavy = PlanRequest(
            window=ONE_DAY, quotas=quotas(ریاضی=240), intensity=IntensityLevel.HEAVY,
        )
        light = engine().plan(
            request_light, existing_events={STUDENT: []},
        ).draft_for(STUDENT)
        heavy = engine().plan(
            request_heavy, existing_events={STUDENT: []},
        ).draft_for(STUDENT)

        self.assertGreater(len(light.blocks), len(heavy.blocks))
        self.assertTrue(all(block.minutes <= 60 for block in light.blocks))
        self.assertTrue(all(block.minutes <= 120 for block in heavy.blocks))

    def test_never_places_outside_the_awake_window(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=600))
        draft = engine().plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)
        self.assert_valid_schedule(draft)

    def test_existing_events_are_never_overwritten(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180))
        events = [fixed_event('class', '07:00', '12:00')]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)
        self.assert_valid_schedule(draft, walls=events)
        self.assertTrue(all(block.slot.start_minutes >= 12 * 60 for block in draft.blocks))

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


class SubjectBalanceTests(TestCase, InvariantAssertions):
    def test_the_same_subject_is_not_stacked_back_to_back(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180, فیزیک=180))
        draft = engine().plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)

        blocks = sorted(draft.blocks, key=lambda block: block.slot.start_minutes)
        glued = sum(
            1 for previous, current in zip(blocks, blocks[1:])
            if previous.subject == current.subject
            and current.slot.start_minutes - previous.slot.end_minutes <= 15
        )
        self.assertEqual(glued, 0)

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


class BurnoutTests(TestCase, InvariantAssertions):
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
        self.assertTrue(all(total <= 180 for total in per_day.values()))
        self.assertEqual(sum(per_day.values()), 360)

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
        self.assertIn(
            PlanWarningCode.BURNOUT_CAP, [warning.code for warning in draft.warnings],
        )


class DeadlockTests(TestCase, InvariantAssertions):
    def test_reports_shortfall_when_capacity_is_not_enough(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=600))
        events = [fixed_event('class', '07:00', '20:00')]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)

        self.assertTrue(draft.has_deadlock)
        self.assertLess(draft.allocated_minutes, 600)
        self.assertLessEqual(draft.allocated_minutes, draft.capacity_minutes)
        self.assertEqual(
            draft.shortfall_minutes, draft.required_minutes - draft.allocated_minutes,
        )
        self.assertIn(
            PlanWarningCode.CAPACITY_SHORTFALL,
            [warning.code for warning in draft.warnings],
        )
        self.assert_valid_schedule(draft, walls=events)

    def test_reports_per_subject_shortfall(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=180, فیزیک=180))
        events = [fixed_event('class', '07:00', '21:00')]
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
        events = [fixed_event('class', '07:00', '23:00')]
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
                    slot=TimeRange.from_clock('07:00', '22:00'),
                    title='کلاس',
                    kind=EventKind.IMMUTABLE,
                    authority=WriteAuthority.SCHOOL_MANAGER,
                )
            ],
        })
        self.assertTrue(preview.has_deadlock)
        self.assertEqual([d.student_id for d in preview.blocked_students], [busy_student])
        self.assertFalse(preview.draft_for(STUDENT).has_deadlock)


class MultiDayTests(TestCase, InvariantAssertions):
    def test_work_spreads_across_the_window(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(2)), quotas=quotas(ریاضی=270),
        )
        policy = StaticBurnoutPolicy(max_daily_minutes=90, max_window_minutes=None)
        draft = engine(burnout=policy).plan(
            request, existing_events={STUDENT: []},
        ).draft_for(STUDENT)
        self.assertEqual(len({str(block.date) for block in draft.blocks}), 3)

    def test_load_is_balanced_even_without_a_daily_cap(self):
        request = PlanRequest(
            window=PlanWindow(DAY, DAY.add_days(6)), quotas=quotas(ریاضی=720),
        )
        draft = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT)
        dates = {str(block.date) for block in draft.blocks}
        self.assertEqual(draft.allocated_minutes, 720)
        self.assertGreaterEqual(len(dates), 5)

    def test_blocks_get_varied_colors(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=360, فیزیک=360))
        draft = engine().plan(request, existing_events={STUDENT: []}).draft_for(STUDENT)
        self.assertGreaterEqual(len(draft.blocks), 4)
        self.assertGreater(len({block.color for block in draft.blocks}), 1)

    def test_events_of_other_days_do_not_leak(self):
        request = PlanRequest(window=ONE_DAY, quotas=quotas(ریاضی=90))
        events = [fixed_event('class', '07:00', '23:00', date=DAY.add_days(1))]
        draft = engine().plan(
            request, existing_events={STUDENT: events},
        ).draft_for(STUDENT)
        self.assertEqual(len(draft.blocks), 1)
        self.assertEqual(draft.blocks[0].date, DAY)
