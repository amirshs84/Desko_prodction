"""SubjectQuota — «چند دقیقه از این درس در این بازه».

درس فعلاً یک برچسب متنی است (بدون کاتالوگ و FK) چون در این فاز کاتالوگ درس وجود
ندارد؛ نام درس عنوان بلوک هم می‌شود.
"""
from __future__ import annotations

from dataclasses import dataclass

from ....shared.domain.errors import ValidationError
from ....shared.domain.value_object import ValueObject

MAX_SUBJECT_NAME_LENGTH = 100
MAX_QUOTA_MINUTES = 60 * 200  # سقف عقلانی برای جلوگیری از ورودی اشتباه


@dataclass(frozen=True)
class SubjectQuota(ValueObject):
    subject: str
    minutes: int

    def __post_init__(self) -> None:
        if not self.subject or not self.subject.strip():
            raise ValidationError('نام درس نمی‌تواند خالی باشد.')
        if len(self.subject) > MAX_SUBJECT_NAME_LENGTH:
            raise ValidationError('نام درس بیش از حد بلند است.')
        if self.minutes <= 0:
            raise ValidationError(
                f'زمان درخواستی برای «{self.subject}» باید بزرگ‌تر از صفر باشد.',
            )
        if self.minutes > MAX_QUOTA_MINUTES:
            raise ValidationError(
                f'زمان درخواستی برای «{self.subject}» غیرواقعی است.',
                meta={'minutes': self.minutes},
            )

    def with_minutes(self, minutes: int) -> 'SubjectQuota':
        return SubjectQuota(subject=self.subject, minutes=minutes)
