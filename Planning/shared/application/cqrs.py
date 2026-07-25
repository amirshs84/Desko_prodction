"""پایه‌های CQRS — تفکیک نیت «تغییر» از «خواندن».

  - Command : قصد تغییر وضعیت سیستم (ساخت رویداد، جابه‌جایی بلوک).
  - Query   : قصد خواندن بدون side-effect (فهرست رویدادهای یک بازه).

این‌ها dataclass های خالص و بدون منطق هستند (فقط حامل داده)؛ منطق در Service.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Command:
    """پایه‌ی نشانه‌گذاری برای Command ها (عملیات تغییر وضعیت)."""


@dataclass(frozen=True)
class Query:
    """پایه‌ی نشانه‌گذاری برای Query ها (عملیات خواندن)."""
