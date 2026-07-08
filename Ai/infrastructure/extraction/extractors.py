"""آداپتورهای استخراج متن per-format.

هر تابع بایت‌های فایل را می‌گیرد و متن برمی‌گرداند. وابستگی‌های خارجی به‌صورت
lazy import داخل تابع بارگذاری می‌شوند؛ اگر کتابخانه نصب نباشد، خطای واضح داده
می‌شود (نه ImportError مبهم هنگام بارگذاری ماژول).
"""
from __future__ import annotations

import io
import zipfile

from ...shared.domain.errors import ValidationError


def extract_txt(data: bytes) -> str:
    return data.decode("utf-8", errors="replace")


def extract_pdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader  # lazy
    except ImportError as exc:  # pragma: no cover
        raise ValidationError(
            "استخراج PDF نیازمند نصب pypdf است."
        ) from exc
    reader = PdfReader(io.BytesIO(data))
    parts = [(page.extract_text() or "") for page in reader.pages]
    return "\n".join(p for p in parts if p).strip()


def extract_docx(data: bytes) -> str:
    try:
        import docx  # python-docx, lazy
    except ImportError as exc:  # pragma: no cover
        raise ValidationError(
            "استخراج DOCX نیازمند نصب python-docx است."
        ) from exc
    document = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in document.paragraphs if p.text).strip()


def extract_xlsx(data: bytes) -> str:
    try:
        import openpyxl  # lazy
    except ImportError as exc:  # pragma: no cover
        raise ValidationError(
            "استخراج XLSX نیازمند نصب openpyxl است."
        ) from exc
    wb = openpyxl.load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    lines: list[str] = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            cells = [str(c) for c in row if c is not None]
            if cells:
                lines.append("\t".join(cells))
    return "\n".join(lines).strip()


def extract_zip(data: bytes) -> str:
    """متنِ فایل‌های متنی داخل ZIP را جمع می‌کند (فقط .txt/.md برای امنیت)."""
    out: list[str] = []
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        for name in zf.namelist():
            if name.endswith("/"):
                continue
            if name.lower().rsplit(".", 1)[-1] in {"txt", "md"}:
                with zf.open(name) as fh:
                    out.append(fh.read().decode("utf-8", errors="replace"))
    return "\n\n".join(out).strip()
