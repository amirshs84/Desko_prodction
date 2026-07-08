"""Port: EventPublisher — انتشار رویدادهای دامنه.

Unit of Work پس از commit، رویدادها را از طریق این قرارداد منتشر می‌کند. اینکه
انتشار درون‌فرایندی (in-process) باشد یا از طریق صف پیام (broker)، تصمیم
infrastructure است، نه دغدغه‌ی لایه‌ی application.
"""
from __future__ import annotations

from typing import Protocol

from ...shared.domain.events import DomainEvent


class EventPublisher(Protocol):
    def publish(self, event: DomainEvent) -> None: ...
