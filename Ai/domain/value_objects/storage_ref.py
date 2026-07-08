"""StorageRef — ارجاع به فایل خام در Object Storage (Value Object).

فایل واقعی در S3/MinIO است؛ دامنه فقط «مرجع» آن را می‌شناسد. checksum برای
deduplication و بررسی یکپارچگی استفاده می‌شود.
"""
from __future__ import annotations

from dataclasses import dataclass

from ...shared.domain.value_object import ValueObject


@dataclass(frozen=True)
class StorageRef(ValueObject):
    bucket: str
    key: str
    checksum_sha256: str
