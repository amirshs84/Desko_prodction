"""Port: دفترچه‌ی مدرسه — پنجره‌ی محدود اپ Planning به داده‌های سازمانی اپ ``api``.

اپ Planning نباید مدل‌های ``api`` را مستقیم import کند؛ در عوض همین قرارداد باریک
را می‌شناسد و پیاده‌سازی آن در ``shared/infrastructure/django_school_directory.py``
قرار دارد (الگوی Anti-Corruption Layer).

چرا در shared و نه داخل یک کانتکست؟ هم کانتکست تقویم (برای پخش رویداد ثابت روی
اعضای کلاس) و هم کانتکست مداخله (برای فهرست و اعتبارسنجی اعضای گروه) به همین
مفهوم نیاز دارند. یک پیاده‌سازی مشترک، از دو آداپتور موازی و واگرا جلوگیری می‌کند.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol, runtime_checkable


@dataclass(frozen=True)
class ClassInfo:
    id: int
    school_id: int
    name: str
    code: str
    grade: str


@dataclass(frozen=True)
class StudentInfo:
    user_id: int
    school_id: int | None
    full_name: str
    phone_number: str
    grade: str
    olympiad_field: str = ''
    class_names: tuple[str, ...] = ()


@dataclass(frozen=True)
class ConsultantInfo:
    user_id: int
    school_id: int | None
    full_name: str
    phone_number: str


@dataclass(frozen=True)
class StudentFilter:
    """صافی‌های فهرست دانش‌آموزان (همه اختیاری)."""

    search: str | None = None
    grade: str | None = None
    class_id: int | None = None


@runtime_checkable
class SchoolDirectory(Protocol):
    def get_class(self, class_id: int, *, school_id: int) -> ClassInfo:
        """کلاس متعلق به همان مدرسه؛ در غیر این صورت ``NotFoundError``."""
        ...

    def list_class_student_user_ids(self, class_id: int, *, school_id: int) -> list[int]:
        """شناسه‌ی کاربری دانش‌آموزان فعالِ عضو یک کلاس."""
        ...

    def get_student(self, user_id: int) -> StudentInfo:
        """اطلاعات پایه‌ی یک دانش‌آموز؛ در صورت نبود، ``NotFoundError``."""
        ...

    def list_students(
        self, school_id: int, *, filters: StudentFilter | None = None,
    ) -> list[StudentInfo]:
        """دانش‌آموزان فعال یک مدرسه، مرتب بر اساس نام."""
        ...

    def list_students_by_ids(
        self, school_id: int, user_ids: Iterable[int],
    ) -> list[StudentInfo]:
        """اطلاعات دسته‌ای دانش‌آموزانِ همین مدرسه از میان شناسه‌های داده‌شده.

        شناسه‌هایی که دانش‌آموز این مدرسه نیستند، در خروجی نمی‌آیند؛ پس همین متد
        هم‌زمان «اعتبارسنجی عضویت گروه» و «داده‌ی نمایشی اعضا» را با یک کوئری
        فراهم می‌کند. مشاور نباید بتواند کاربری از مدرسه‌ی دیگر را عضو گروه کند.
        """
        ...

    def list_consultants(self, school_id: int) -> list[ConsultantInfo]:
        """مشاوران فعال یک مدرسه، مرتب بر اساس نام."""
        ...

    def get_consultant(self, user_id: int, *, school_id: int) -> ConsultantInfo | None:
        """مشاور فعال همین مدرسه؛ در غیر این صورت ``None``."""
        ...
