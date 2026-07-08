"""Ports — قراردادهای وابستگی‌های بیرونی (Interfaces سمت خروجی برنامه).

نمونه‌ها: LLMProvider, VectorStore, ObjectStorage, CacheClient,
TranscriptionProvider.

این interfaceها توسط infrastructure پیاده‌سازی می‌شوند. لایه‌ی application فقط
به این انتزاع‌ها وابسته است تا Provider ها جایگزین‌پذیر و ایزوله بمانند
(Strategy Pattern + Dependency Inversion).
"""
