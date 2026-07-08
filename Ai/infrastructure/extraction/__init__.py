"""Extraction — آداپتورهای استخراج متن از فرمت‌های مختلف فایل.

``build_default_extractor()`` یک ``CompositeTextExtractor`` می‌سازد که بر اساس
``FileType`` به آداپتور مناسب مسیریابی می‌کند. آداپتورهای وابسته به کتابخانه‌های
خارجی (pypdf/python-docx/openpyxl) با lazy import کار می‌کنند تا نبودِ آن‌ها
import پروژه را نشکند.
"""
from .composite import CompositeTextExtractor, build_default_extractor

__all__ = ["CompositeTextExtractor", "build_default_extractor"]
