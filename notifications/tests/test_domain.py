"""تست واحد دامنه: invariantها، چرخه‌ی عمر نوتیف، QuietHours، PriorityPolicy."""
from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from notifications.domain.entities import Device
from notifications.domain.enums import (
    ChannelType,
    NotificationStatus,
    Platform,
    Priority,
    SuppressionReason,
)
from notifications.domain.errors import InvalidNotification
from notifications.domain.policies import policy_for
from notifications.domain.value_objects import (
    NotificationAction,
    NotificationContent,
    QuietHours,
)
from notifications.tests.factories import content, now, notification


class NotificationAggregateTests(SimpleTestCase):
    def test_create_records_created_event_and_default_ttl(self):
        n = notification(priority=Priority.HIGH)
        self.assertEqual(n.status, NotificationStatus.PENDING)
        self.assertEqual(len(n.pending_events), 1)
        self.assertEqual(n.pending_events[0].type.value, "CREATED")
        self.assertEqual(n.expires_at, n.created_at + policy_for(Priority.HIGH).default_ttl)

    def test_requires_channel_and_internal_deeplink(self):
        with self.assertRaises(InvalidNotification):
            notification(channels=set())
        with self.assertRaises(InvalidNotification):
            notification(deeplink="https://evil.example/phish")

    def test_suppress_is_terminal(self):
        n = notification()
        n.suppress(SuppressionReason.USER_PREFERENCE, now())
        self.assertEqual(n.status, NotificationStatus.SUPPRESSED)
        with self.assertRaises(InvalidNotification):
            n.mark_queued(now())

    def test_defer_then_dispatch(self):
        n = notification()
        until = now() + timedelta(hours=2)
        n.defer(until, now(), reason="quiet_hours")
        self.assertEqual(n.status, NotificationStatus.DEFERRED)
        self.assertEqual(n.scheduled_at, until)
        n.mark_dispatched(now(), ["INBOX"])
        self.assertEqual(n.status, NotificationStatus.DISPATCHED)
        self.assertTrue(n.is_terminal)

    def test_restrict_channels_intersects(self):
        n = notification(channels={ChannelType.PUSH, ChannelType.INBOX, ChannelType.REALTIME})
        n.restrict_channels({ChannelType.INBOX, ChannelType.PUSH})
        self.assertEqual(n.channels, frozenset({ChannelType.INBOX, ChannelType.PUSH}))


class ContentValueObjectTests(SimpleTestCase):
    def test_rejects_empty_title_and_too_many_actions(self):
        with self.assertRaises(InvalidNotification):
            NotificationContent(title="")
        actions = tuple(
            NotificationAction(id=f"a{i}", title=f"دکمه {i}") for i in range(4)
        )
        with self.assertRaises(InvalidNotification):
            NotificationContent(title="x", actions=actions)

    def test_big_picture_needs_image(self):
        from notifications.domain.enums import ContentStyle

        with self.assertRaises(InvalidNotification):
            NotificationContent(title="عکس", style=ContentStyle.BIG_PICTURE)

    def test_roundtrip_dict(self):
        original = content(
            actions=(NotificationAction(id="open", title="مشاهده"),),
        )
        restored = NotificationContent.from_dict(original.to_dict())
        self.assertEqual(restored.title, original.title)
        self.assertEqual(restored.actions[0].id, "open")


class QuietHoursTests(SimpleTestCase):
    def test_overnight_contains(self):
        qh = QuietHours.parse("23:00-07:00")
        self.assertTrue(qh.contains(time(23, 30)))
        self.assertTrue(qh.contains(time(2, 0)))
        self.assertFalse(qh.contains(time(12, 0)))
        self.assertFalse(qh.contains(time(7, 0)))

    def test_same_day_range(self):
        qh = QuietHours(time(13, 0), time(15, 0))
        self.assertTrue(qh.contains(time(14, 0)))
        self.assertFalse(qh.contains(time(15, 0)))

    def test_next_end_rolls_to_tomorrow(self):
        tz = ZoneInfo("Asia/Tehran")
        qh = QuietHours.parse("23:00-07:00")
        evening = datetime(2026, 10, 24, 23, 30, tzinfo=tz)
        end = qh.next_end(evening, tz)
        self.assertEqual(end.day, 25)
        self.assertEqual(end.hour, 7)


class PriorityPolicyTests(SimpleTestCase):
    def test_critical_bypasses_quiet_and_cap(self):
        p = policy_for(Priority.CRITICAL)
        self.assertTrue(p.bypass_quiet_hours)
        self.assertTrue(p.bypass_frequency_cap)
        self.assertEqual(p.queue, "notif_critical")
        self.assertEqual(p.android_channel, "desko_critical")
        self.assertEqual(p.fcm_priority, "high")

    def test_high_bypasses_cap_not_quiet(self):
        p = policy_for(Priority.HIGH)
        self.assertFalse(p.bypass_quiet_hours)
        self.assertTrue(p.bypass_frequency_cap)
        self.assertEqual(p.queue, "notif_critical")

    def test_low_goes_to_bulk(self):
        self.assertEqual(policy_for(Priority.LOW).queue, "notif_bulk")


class DeviceTests(SimpleTestCase):
    def test_register_and_reassign_rotates_secret(self):
        device = Device.register(
            user_id=1, platform=Platform.ANDROID, token="tok-1", now=now()
        )
        secret = device.tracking_secret
        device.refresh(user_id=2, now=now(), app_version="2", locale="fa", timezone="UTC")
        self.assertEqual(device.user_id, 2)
        self.assertNotEqual(device.tracking_secret, secret)
        self.assertTrue(device.is_active)
