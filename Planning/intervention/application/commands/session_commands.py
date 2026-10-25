"""فرمان‌های جلسه‌ی مشاوره."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class CreateSessionCommand:
    student_id: int
    title: str
    starts_at: datetime


@dataclass(frozen=True)
class UpdateSessionCommand:
    session_id: int
    title: str | None = None
    starts_at: datetime | None = None
    status: str | None = None
