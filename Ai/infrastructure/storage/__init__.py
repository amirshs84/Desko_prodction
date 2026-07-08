"""Object Storage — آداپتورهای ذخیره‌ی فایل خام (Attachments).

``LocalObjectStorage`` برای توسعه/تست؛ در prod با آداپتور S3/MinIO (پشت همان
Port ``ObjectStorage``) جایگزین می‌شود.
"""
from .local_storage import LocalObjectStorage

__all__ = ["LocalObjectStorage"]
