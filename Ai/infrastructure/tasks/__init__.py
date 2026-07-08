"""Celery Tasks — کارهای پس‌زمینه با صف‌های مجزا.

نمونه‌ها: generate_ai_response, parse_attachment, embed_chunks,
summarize_conversation, flush_quota_counters, purge_soft_deleted.

Task ها نازک‌اند: فقط وابستگی‌ها را از Container می‌گیرند و Service مناسب را
صدا می‌زنند تا منطق کسب‌وکار در Service بماند نه در task.

محتوا در «لایه ۱۶: Celery Tasks» تکمیل می‌شود.
"""
