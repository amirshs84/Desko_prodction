"""قواعد دامنه‌ی فایل — نگاشت MIME/پسوند به FileType و اعتبارسنجی نوع.

این منطق «واژگان کسب‌وکار» است (چه فایل‌هایی مجازند و به کدام دسته می‌افتند)، پس
در دامنه قرار می‌گیرد نه در لایه‌ی HTTP. نوع فایل هم از روی MIME و هم پسوند
resolve می‌شود (MIME اولویت دارد؛ اگر ناشناخته بود، پسوند بررسی می‌شود).
"""
from __future__ import annotations

from ..shared.domain.errors import ValidationError
from .enums import FileType

_MIME_TO_TYPE: dict[str, FileType] = {
    "application/pdf": FileType.PDF,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileType.DOCX,
    "application/msword": FileType.DOCX,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileType.XLSX,
    "application/vnd.ms-excel": FileType.XLSX,
    "text/plain": FileType.TXT,
    "application/zip": FileType.ZIP,
    "application/x-zip-compressed": FileType.ZIP,
    "image/png": FileType.IMAGE,
    "image/jpeg": FileType.IMAGE,
    "image/gif": FileType.IMAGE,
    "image/webp": FileType.IMAGE,
    "audio/mpeg": FileType.AUDIO,
    "audio/wav": FileType.AUDIO,
    "audio/x-wav": FileType.AUDIO,
    "audio/webm": FileType.AUDIO,
    "audio/ogg": FileType.AUDIO,
    "video/mp4": FileType.VIDEO,
    "video/webm": FileType.VIDEO,
    "video/quicktime": FileType.VIDEO,
}

_EXT_TO_TYPE: dict[str, FileType] = {
    "pdf": FileType.PDF,
    "docx": FileType.DOCX,
    "doc": FileType.DOCX,
    "xlsx": FileType.XLSX,
    "xls": FileType.XLSX,
    "txt": FileType.TXT,
    "md": FileType.TXT,
    "zip": FileType.ZIP,
    "png": FileType.IMAGE,
    "jpg": FileType.IMAGE,
    "jpeg": FileType.IMAGE,
    "gif": FileType.IMAGE,
    "webp": FileType.IMAGE,
    "mp3": FileType.AUDIO,
    "wav": FileType.AUDIO,
    "ogg": FileType.AUDIO,
    "mp4": FileType.VIDEO,
    "webm": FileType.VIDEO,
    "mov": FileType.VIDEO,
}


def resolve_file_type(*, mime_type: str, filename: str) -> FileType:
    """نوع فایل را از MIME (اولویت) و سپس پسوند تشخیص می‌دهد.

    اگر هیچ‌کدام به نوع مجاز نگاشت نشوند، ``ValidationError`` پرتاب می‌شود.
    """
    mime = (mime_type or "").split(";")[0].strip().lower()
    if mime in _MIME_TO_TYPE:
        return _MIME_TO_TYPE[mime]

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in _EXT_TO_TYPE:
        return _EXT_TO_TYPE[ext]

    raise ValidationError(
        "نوع فایل پشتیبانی نمی‌شود.",
        meta={"mime_type": mime_type, "filename": filename},
    )
