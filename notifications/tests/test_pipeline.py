"""هر stage از pipeline با fakeها، بدون دیتابیس."""
from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from notifications.application.pipeline import (
    DedupeStage,
    ExpiryStage,
    FrequencyCapStage,
    NotificationPipeline,
    PipelineContext,
    PreferenceStage,
    QuietHoursStage,
    Verdict,
)
from notifications.domain.enums import ChannelType, Priority, SuppressionReason
from notifications.tests.factories import (
    FakeRateLimiter,
    category,
    notification,
    now,
    preference,
)


def _ctx(n, *, cat=None, pref=None, clock=None) -> PipelineContext:
    return PipelineContext(
        notification=n,
        category=cat or category(),
        preference=pref or preference(),
        now=clock or now(),
    )


class ExpiryStageTests(SimpleTestCase):
    def test_expired_is_suppressed(self):
        clock = now()
        n = notification(now=clock - timedelta(hours=2), expires_at=clock - timedelta(minutes=1))
        result = ExpiryStage().evaluate(_ctx(n, clock=clock))
        self.assertEqual(result.verdict, Verdict.SUPPRESS)
        self.assertEqual(result.reason, SuppressionReason.EXPIRED)

    def test_fresh_passes(self):
        result = ExpiryStage().evaluate(_ctx(notification()))
        self.assertEqual(result.verdict, Verdict.PASS)


class PreferenceStageTests(SimpleTestCase):
    def test_disabled_category_suppresses_non_critical(self):
        n = notification(priority=Priority.NORMAL)
        result = PreferenceStage().evaluate(_ctx(n, cat=category(is_active=False)))
        self.assertEqual(result.reason, SuppressionReason.CATEGORY_DISABLED)

    def test_critical_ignores_inactive_category(self):
        n = notification(priority=Priority.CRITICAL, category_key="exam")
        result = PreferenceStage().evaluate(
            _ctx(n, cat=category(key="exam", is_active=False, user_configurable=False))
        )
        self.assertEqual(result.verdict, Verdict.PASS)

    def test_opt_out_drops_channels_then_suppresses(self):
        n = notification(channels={ChannelType.PUSH, ChannelType.INBOX})
        pref = preference()
        pref.set_channel("tips", ChannelType.PUSH, False)
        pref.set_channel("tips", ChannelType.INBOX, False)
        result = PreferenceStage().evaluate(_ctx(n, pref=pref))
        self.assertEqual(result.reason, SuppressionReason.USER_PREFERENCE)

    def test_partial_opt_out_restricts_channels(self):
        n = notification(channels={ChannelType.PUSH, ChannelType.INBOX})
        pref = preference()
        pref.set_channel("tips", ChannelType.PUSH, False)
        result = PreferenceStage().evaluate(_ctx(n, pref=pref))
        self.assertEqual(result.verdict, Verdict.PASS)
        self.assertEqual(n.channels, frozenset({ChannelType.INBOX}))


class QuietHoursStageTests(SimpleTestCase):
    def test_defers_during_quiet_hours(self):
        night = datetime(2026, 10, 24, 23, 30, tzinfo=ZoneInfo("Asia/Tehran"))
        n = notification(now=night, priority=Priority.NORMAL)
        result = QuietHoursStage().evaluate(_ctx(n, clock=night))
        self.assertEqual(result.verdict, Verdict.DEFER)
        self.assertEqual(result.until.hour, 7)

    def test_critical_bypasses(self):
        night = datetime(2026, 10, 24, 23, 30, tzinfo=ZoneInfo("Asia/Tehran"))
        n = notification(now=night, priority=Priority.CRITICAL)
        result = QuietHoursStage().evaluate(_ctx(n, clock=night))
        self.assertEqual(result.verdict, Verdict.PASS)

    def test_suppresses_if_expires_before_quiet_end(self):
        night = datetime(2026, 10, 24, 23, 30, tzinfo=ZoneInfo("Asia/Tehran"))
        n = notification(now=night, expires_at=night + timedelta(minutes=10))
        result = QuietHoursStage().evaluate(_ctx(n, clock=night))
        self.assertEqual(result.reason, SuppressionReason.EXPIRED)


class DedupeStageTests(SimpleTestCase):
    def test_second_identical_is_duplicate(self):
        limiter = FakeRateLimiter()
        stage = DedupeStage(limiter, window_seconds=60)
        first = stage.evaluate(_ctx(notification()))
        second = stage.evaluate(_ctx(notification()))
        self.assertEqual(first.verdict, Verdict.PASS)
        self.assertEqual(second.reason, SuppressionReason.DUPLICATE)


class FrequencyCapStageTests(SimpleTestCase):
    def test_normal_capped_after_limit(self):
        limiter = FakeRateLimiter()
        stage = FrequencyCapStage(limiter, {Priority.NORMAL: 1})
        self.assertEqual(stage.evaluate(_ctx(notification())).verdict, Verdict.PASS)
        self.assertEqual(
            stage.evaluate(_ctx(notification())).reason, SuppressionReason.FREQUENCY_CAP
        )

    def test_high_bypasses_cap(self):
        limiter = FakeRateLimiter()
        stage = FrequencyCapStage(limiter, {Priority.HIGH: 1, Priority.NORMAL: 1})
        n = notification(priority=Priority.HIGH)
        self.assertEqual(stage.evaluate(_ctx(n)).verdict, Verdict.PASS)
        self.assertEqual(stage.evaluate(_ctx(notification(priority=Priority.HIGH))).verdict, Verdict.PASS)


class PipelineOrderTests(SimpleTestCase):
    def test_stops_on_first_suppress(self):
        limiter = FakeRateLimiter()
        pipeline = NotificationPipeline(
            [
                ExpiryStage(),
                PreferenceStage(),
                QuietHoursStage(),
                DedupeStage(limiter),
                FrequencyCapStage(limiter, {Priority.NORMAL: 10}),
            ]
        )
        clock = now()
        n = notification(now=clock - timedelta(hours=2), expires_at=clock - timedelta(seconds=1))
        result = pipeline.run(_ctx(n, clock=clock))
        self.assertEqual(result.stage, "expiry")
        self.assertEqual(limiter.seen, {})
