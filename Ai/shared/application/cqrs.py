"""پایه‌های CQRS — تفکیک نیت «تغییر» از «خواندن».

  - Command : قصد تغییر وضعیت سیستم (ارسال پیام، تغییر نام مکالمه). نتیجه‌ی
              جانبی دارد و معمولاً از طریق Service اجرا می‌شود.
  - Query   : قصد خواندن بدون تغییر وضعیت (لیست مکالمات). بدون side-effect.

چرا این تفکیک؟ خواندن و نوشتن نیازهای مقیاس‌پذیری متفاوتی دارند (مثلاً Query ها
می‌توانند به Read Replica بروند و Command ها به Primary). جداسازی نوع‌ها از همین
سطح مدل، مسیر بهینه‌سازی آینده را باز می‌گذارد.

اینها dataclass های خالص و بدون منطق هستند (فقط حامل داده). منطق در Handler/Service.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Command:
    """پایه‌ی نشانه‌گذاری برای Command ها (عملیات تغییر وضعیت)."""


@dataclass(frozen=True)
class Query:
    """پایه‌ی نشانه‌گذاری برای Query ها (عملیات خواندن)."""
