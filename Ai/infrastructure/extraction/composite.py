"""CompositeTextExtractor — مسیریابی استخراج بر اساس FileType.

یک نگاشت ``FileType → تابع استخراج`` نگه می‌دارد و Port ``TextExtractor`` را
پیاده می‌کند. فرمت‌های غیرمتنی (تصویر/صوت/ویدئو) از این مسیر پشتیبانی نمی‌شوند؛
آن‌ها در آینده از Vision/Speech-to-Text عبور می‌کنند، نه استخراج متن.
"""
from __future__ import annotations

from typing import Callable

from ...domain.enums import FileType
from ...shared.domain.errors import ValidationError
from . import extractors as ex


class CompositeTextExtractor:
    def __init__(self, handlers: dict[FileType, Callable[[bytes], str]]) -> None:
        self._handlers = handlers

    def supports(self, file_type: FileType) -> bool:
        return file_type in self._handlers

    def extract(
        self, *, file_type: FileType, data: bytes, mime_type: str, filename: str
    ) -> str:
        handler = self._handlers.get(file_type)
        if handler is None:
            raise ValidationError(
                "استخراج متن برای این نوع فایل پشتیبانی نمی‌شود.",
                meta={"file_type": file_type.value},
            )
        return handler(data)


def build_default_extractor() -> CompositeTextExtractor:
    return CompositeTextExtractor(
        {
            FileType.TXT: ex.extract_txt,
            FileType.PDF: ex.extract_pdf,
            FileType.DOCX: ex.extract_docx,
            FileType.XLSX: ex.extract_xlsx,
            FileType.ZIP: ex.extract_zip,
        }
    )
