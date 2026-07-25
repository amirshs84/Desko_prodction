"""واژگان مشترک بین کانتکست‌های اپ Planning."""
from __future__ import annotations

from enum import Enum


class WriteAuthority(str, Enum):
    """اختیار نوشتن روی تقویم — «به نیابت از چه کسی» عملیات انجام می‌شود.

    این مقدار ذخیره نمی‌شود؛ فقط برای اعمال قواعد دامنه در زمان اجرا است. اینکه
    یک کاربر چه اختیاری دارد، در لایه‌ی REST از نقش او استخراج می‌شود.

    تنها ``SCHOOL_MANAGER`` مجاز به ساخت/تغییر/حذف رویدادهای ثابت است؛ مشاور،
    دانش‌آموز و الگوریتم در هیچ حالتی (حتی اعمال قطعی برنامه) نمی‌توانند.
    """

    STUDENT = "student"
    CONSULTANT = "consultant"
    ALGORITHM = "algorithm"
    SCHOOL_MANAGER = "school_manager"
