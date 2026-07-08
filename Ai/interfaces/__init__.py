"""Interfaces Layer — ورودی/خروجی سیستم (Adapters سمت ورودی).

این لایه پروتکل‌های بیرونی را به Command/DTO تبدیل می‌کند و Service ها را صدا
می‌زند:
  - rest: DRF Views/Serializers/URLs. View فقط request را به Command تبدیل
    می‌کند؛ هیچ منطق کسب‌وکاری در View نیست.
  - streaming: مصرف‌کننده‌های SSE/WebSocket برای پخش توکن‌به‌توکن پاسخ.

وابستگی مجاز: interfaces -> application. هرگز مستقیم به ORM یا Provider.
"""
