"""Streaming Interface — SSE/WebSocket برای پخش پاسخ هوش مصنوعی.

توکن‌ها از طریق Redis Pub/Sub از Celery worker دریافت و به کلاینت stream
می‌شوند؛ روی ASGI اجرا می‌شود. محتوا در «لایه ۱۵: Streaming» تکمیل می‌شود.
"""
