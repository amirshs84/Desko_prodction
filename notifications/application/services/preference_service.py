from __future__ import annotations

from typing import Any

from ...domain.entities import UserPreference
from ...domain.enums import ChannelType
from ...domain.errors import InvalidNotification
from ...domain.repositories import CategoryRepository, PreferenceRepository
from ...domain.value_objects import QuietHours, safe_zone
from ..commands import UpdatePreferencesCommand

# کانال‌هایی که کاربر در UI کنترل می‌کند؛ INBOX همیشه می‌ماند تا سابقه از دست نرود.
USER_TOGGLEABLE = (ChannelType.PUSH, ChannelType.IN_APP)


class PreferenceService:
    def __init__(
        self,
        *,
        preferences: PreferenceRepository,
        categories: CategoryRepository,
        default_quiet_hours: str,
    ) -> None:
        self._preferences = preferences
        self._categories = categories
        self._default_quiet_hours = default_quiet_hours

    def default_for(self, user_id: int) -> UserPreference:
        quiet = QuietHours.parse(self._default_quiet_hours) if self._default_quiet_hours else None
        return UserPreference(user_id=user_id, quiet_hours=quiet)

    def get(self, user_id: int) -> UserPreference:
        return self._preferences.get(user_id) or self.default_for(user_id)

    def describe(self, user_id: int) -> dict[str, Any]:
        pref = self.get(user_id)
        categories = []
        for c in self._categories.list_active():
            categories.append(
                {
                    "key": c.key,
                    "title": c.title,
                    "description": c.description,
                    "configurable": c.user_configurable,
                    "channels": {
                        ch.value: pref.allows(c.key, ch) or not c.user_configurable
                        for ch in USER_TOGGLEABLE
                        if ch in c.default_channels or ch == ChannelType.PUSH
                    },
                }
            )
        return {
            "categories": categories,
            "quiet_hours": pref.quiet_hours.format() if pref.quiet_hours else "",
            "quiet_hours_enabled": pref.quiet_hours_enabled,
            "timezone": pref.timezone,
            "muted_until": pref.muted_until.isoformat() if pref.muted_until else None,
        }

    def update(self, cmd: UpdatePreferencesCommand) -> dict[str, Any]:
        pref = self.get(cmd.user_id)
        configurable = {c.key for c in self._categories.list_active() if c.user_configurable}
        for t in cmd.toggles:
            if t.category != "*" and t.category not in configurable:
                raise InvalidNotification(f"دسته‌ی {t.category!r} قابل تنظیم نیست.")
            if t.channel not in USER_TOGGLEABLE:
                raise InvalidNotification(f"کانال {t.channel.value} قابل تنظیم نیست.")
            pref.set_channel(t.category, t.channel, t.enabled)
        if cmd.quiet_hours is not None:
            pref.quiet_hours = QuietHours.parse(cmd.quiet_hours) if cmd.quiet_hours else None
        if cmd.quiet_hours_enabled is not None:
            pref.quiet_hours_enabled = cmd.quiet_hours_enabled
        if cmd.timezone:
            pref.timezone = safe_zone(cmd.timezone).key
        if cmd.clear_mute:
            pref.muted_until = None
        elif cmd.muted_until is not None:
            pref.muted_until = cmd.muted_until
        self._preferences.save(pref)
        return self.describe(cmd.user_id)
