"""LocalObjectStorage — ذخیره‌ی فایل روی فایل‌سیستم محلی (dev/test).

هر شیء در ``<root>/<bucket>/<key>`` نوشته می‌شود. این آداپتور Port
``ObjectStorage`` را پیاده می‌کند تا در توسعه بدون نیاز به S3/MinIO کار کنیم؛
در prod صرفاً آداپتور دیگری تزریق می‌شود.

نکته‌ی امنیتی: ``key`` می‌تواند شامل «/» باشد (ساختار پوشه‌ای)، اما در برابر
path traversal (مثل ``..``) محافظت می‌شود تا نوشتن خارج از root ممکن نباشد.
"""
from __future__ import annotations

from pathlib import Path

from ...application.ports.object_storage import StoredObject


class LocalObjectStorage:
    def __init__(self, root: str) -> None:
        self._root = Path(root).resolve()

    def put(
        self, *, bucket: str, key: str, data: bytes, content_type: str
    ) -> StoredObject:
        path = self._resolve(bucket, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return StoredObject(bucket=bucket, key=key, size_bytes=len(data))

    def get(self, *, bucket: str, key: str) -> bytes:
        return self._resolve(bucket, key).read_bytes()

    def delete(self, *, bucket: str, key: str) -> None:
        path = self._resolve(bucket, key)
        path.unlink(missing_ok=True)

    def exists(self, *, bucket: str, key: str) -> bool:
        return self._resolve(bucket, key).exists()

    # ---------- کمکی‌ها ----------

    def _resolve(self, bucket: str, key: str) -> Path:
        base = (self._root / bucket).resolve()
        target = (base / key).resolve()
        # جلوگیری از path traversal: مسیر نهایی باید داخل bucket بماند.
        if not str(target).startswith(str(base)):
            raise ValueError("کلید ذخیره‌سازی نامعتبر است (path traversal).")
        return target
