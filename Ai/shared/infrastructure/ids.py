"""تولید شناسه‌ی UUIDv7 (RFC 9562) — کلید اصلی همه‌ی جداول.

چرا UUIDv7؟
  - زمان‌مرتب (time-ordered): ۴۸ بیت ابتدایی، timestamp میلی‌ثانیه‌ای است، پس
    شناسه‌ها تقریباً به ترتیب زمان ساخت مرتب می‌شوند → locality مناسب در ایندکس
    B-Tree و جلوگیری از page-split پرهزینه‌ی UUIDv4 تصادفی.
  - یکتای سراسری: مناسب محیط توزیع‌شده و Multi-Tenant، بدون hotspot دنباله‌ها
    (sequence) و بدون افشای تعداد رکوردها (enumeration attack).

پیاده‌سازی دستی است تا به نسخه‌ی خاص پایتون (که uuid7 را در stdlib دارد یا ندارد)
یا به یک وابستگی خارجی گره نخوریم.
"""
from __future__ import annotations

import os
import time
from uuid import UUID


def uuid7() -> UUID:
    """یک UUID نسخه ۷ بر اساس زمان فعلی تولید می‌کند."""
    unix_ms = int(time.time() * 1000)
    rand = os.urandom(10)

    b = bytearray(16)
    # ۴۸ بیت timestamp میلی‌ثانیه (big-endian).
    b[0] = (unix_ms >> 40) & 0xFF
    b[1] = (unix_ms >> 32) & 0xFF
    b[2] = (unix_ms >> 24) & 0xFF
    b[3] = (unix_ms >> 16) & 0xFF
    b[4] = (unix_ms >> 8) & 0xFF
    b[5] = unix_ms & 0xFF
    # نسخه ۷ در نیبل بالای بایت ۶.
    b[6] = 0x70 | (rand[0] & 0x0F)
    b[7] = rand[1]
    # variant سازگار با RFC (10xx) در بایت ۸.
    b[8] = 0x80 | (rand[2] & 0x3F)
    b[9] = rand[3]
    b[10:16] = rand[4:10]

    return UUID(bytes=bytes(b))
