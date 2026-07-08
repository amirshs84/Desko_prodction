"""Command های Context پیوست."""
from __future__ import annotations

from dataclasses import dataclass

from ...shared.application.cqrs import Command


@dataclass(frozen=True)
class UploadAttachmentCommand(Command):
    filename: str
    content_type: str
    data: bytes
