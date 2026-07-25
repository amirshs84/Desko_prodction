"""RequestContext — بافت اجرای هر Use-Case در اپ Planning.

به‌جای پاس دادن پراکنده‌ی actor/school به هر متد، آن‌ها را در یک شیء تغییرناپذیر
متمرکز می‌کنیم. لایه‌ی interface این شیء را می‌سازد و به Service تزریق می‌کند؛
بنابراین هر عملیات می‌داند «به نیابت از کدام کاربر، با چه اختیاری و در کدام
مدرسه» اجرا می‌شود — پایه‌ی ایزولاسیون بین مدارس و ردیابی.

توجه: شناسه‌ها int هستند (کلید اصلی جنگو) چون در این اپ روی persistence عمل‌گرا
توافق شده است؛ tenant در این پروژه همان School است.
"""
from __future__ import annotations

from dataclasses import dataclass

from ..domain.enums import WriteAuthority


@dataclass(frozen=True)
class RequestContext:
    actor_user_id: int
    authority: WriteAuthority
    school_id: int | None = None
    trace_id: str = ""
