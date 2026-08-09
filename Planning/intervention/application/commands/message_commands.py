from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SendDirectMessageCommand:
    student_id: int
    body: str
