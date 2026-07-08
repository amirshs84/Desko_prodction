"""بارگذاری اپ Celery هنگام راه‌اندازی Django (در صورت نصب بودن celery).

با try/except محافظت شده تا نبود celery در محیط توسعه (که از حالت inline استفاده
می‌کند) واردسازی پروژه را نشکند.
"""
try:  # pragma: no cover - وابسته به محیط
    from .celery import app as celery_app

    __all__ = ("celery_app",)
except Exception:  # noqa: BLE001 - celery نصب نیست؛ حالت inline استفاده می‌شود
    celery_app = None
    __all__ = ()
