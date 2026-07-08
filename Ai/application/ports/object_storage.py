"""Port: ObjectStorage — انتزاع ذخیره‌ی فایل خام.

دامنه فقط «مرجع» فایل (StorageRef) را می‌شناسد؛ بایت‌های واقعی در یک Object
Storage (S3/MinIO در prod، فایل‌سیستم محلی در dev) زندگی می‌کنند. این Port
جزئیات فنی را از سرویس‌ها پنهان می‌کند تا تعویض backend فقط یک آداپتور جدید باشد
(Dependency Inversion).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class StoredObject:
    bucket: str
    key: str
    size_bytes: int


class ObjectStorage(Protocol):
    def put(
        self, *, bucket: str, key: str, data: bytes, content_type: str
    ) -> StoredObject: ...

    def get(self, *, bucket: str, key: str) -> bytes: ...

    def delete(self, *, bucket: str, key: str) -> None: ...

    def exists(self, *, bucket: str, key: str) -> bool: ...
