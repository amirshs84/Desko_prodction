"""اپلیکیشن Celery پروژه (لایه ۱۶).

الگوی استاندارد Celery + Django: تنظیمات با namespace ``CELERY`` از settings خوانده
می‌شوند و taskها به‌صورت خودکار در اپ‌ها کشف می‌شوند.

این ماژول فقط زمانی import می‌شود که celery نصب باشد (import در
``desko_backend/__init__.py`` با try/except محافظت شده)، تا محیط توسعه‌ی بدون
celery همچنان بالا بیاید.
"""
from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "desko_backend.settings")

app = Celery("desko")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
