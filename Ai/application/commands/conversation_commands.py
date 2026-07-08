"""Command های Context مکالمه.

Command ها حامل داده‌ی خالصِ «نیت کاربر» هستند (بدون منطق). RequestContext
(tenant/user/role/trace) جداگانه به Service پاس داده می‌شود تا امنیت و ردیابی
از payload تفکیک بماند.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from ...shared.application.cqrs import Command


@dataclass(frozen=True)
class CreateConversationCommand(Command):
    model_id: UUID
    title: str | None = None
    temperature: float = 0.7
    top_p: float = 1.0
    max_output_tokens: int | None = None


@dataclass(frozen=True)
class RenameConversationCommand(Command):
    conversation_id: UUID
    title: str
    expected_version: int


@dataclass(frozen=True)
class MutateConversationCommand(Command):
    """برای عملیات‌های تک‌فلگی/وضعیتی: pin, favorite, archive, unarchive, delete."""

    conversation_id: UUID
    expected_version: int


@dataclass(frozen=True)
class ChangeModelCommand(Command):
    """تعویض مدل فعال مکالمه (کاربر می‌تواند مدل هوش مصنوعی را انتخاب کند)."""

    conversation_id: UUID
    model_id: UUID
    expected_version: int
