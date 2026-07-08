"""Domain Layer — هسته‌ی کسب‌وکار (Clean Architecture / DDD).

این لایه قلب سیستم است و به هیچ چیز بیرونی وابسته نیست:
  - بدون وابستگی به Django، DRF، ORM، Celery یا هیچ Provider خارجی.
  - فقط منطق و قواعد خالص کسب‌وکار (Entities، Value Objects، Invariants).
  - Repository ها اینجا فقط به‌صورت «قرارداد» (interface/ABC) تعریف می‌شوند،
    نه پیاده‌سازی.

قاعده‌ی وابستگی (Dependency Rule): جهت وابستگی همیشه به سمت داخل است.
هیچ چیزی در این پکیج نباید از لایه‌های application/infrastructure/interfaces
import کند.

محتوای واقعی در «لایه ۳: Domain Layer» اضافه خواهد شد.
"""
