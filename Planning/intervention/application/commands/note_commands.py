from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CreateNoteCommand:
    student_id: int
    body: str


@dataclass(frozen=True)
class UpdateNoteCommand:
    note_id: int
    body: str
