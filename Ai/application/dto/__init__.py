"""DTOs — اشیاء انتقال داده (خروجی Service ها).

نمونه‌ها: MessageDTO, ConversationDTO, UsageDTO.

DTO ها از Serializer و Model مستقل‌اند تا فیلدهای داخلی به API درز نکنند و در
Celery/تست نیز بدون وابستگی به HTTP قابل استفاده باشند.
"""
