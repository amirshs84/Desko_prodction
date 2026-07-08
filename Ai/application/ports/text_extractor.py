"""Port: TextExtractor — استخراج متن خام از بایت‌های فایل.

RAG به «متن» نیاز دارد، اما پیوست‌ها فرمت‌های گوناگون دارند (PDF/DOCX/XLSX/TXT/
ZIP). این Port جزئیات کتابخانه‌های استخراج را از سرویس ingestion جدا می‌کند تا
افزودن فرمت جدید فقط یک آداپتور تازه باشد (Open/Closed).
"""
from __future__ import annotations

from typing import Protocol

from ...domain.enums import FileType


class TextExtractor(Protocol):
    def supports(self, file_type: FileType) -> bool: ...

    def extract(
        self, *, file_type: FileType, data: bytes, mime_type: str, filename: str
    ) -> str: ...
