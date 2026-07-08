"""Cache — پیاده‌سازی CacheClient روی چارچوب کش Django.

آداپتور اختصاصی Redis و الگوهای کش (لایه ۱۷) رویِ همین پایه سوار می‌شوند.
"""
from .django_cache import DjangoCacheClient
from .keys import CacheKeys

__all__ = ["DjangoCacheClient", "CacheKeys"]
