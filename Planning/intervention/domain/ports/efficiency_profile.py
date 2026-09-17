"""EfficiencyProfileReader — نیم‌رخ بازدهی دانش‌آموز، ساخته‌شده از بازخورد خودش.

در پایان هر بلوک، دانش‌آموز با یک کلیک امتیاز می‌دهد (۱ تا ۵ ستاره برای بازدهی و
۱ تا ۵ برای حال و انرژی). تجمیع این امتیازها دو چیز به موتور می‌دهد:

  • ضریب بازدهی ``efficiency`` — دانش‌آموزی که مدام «بازدهی پایین» ثبت می‌کند برای
    همان حجم کار وقت بیشتری لازم دارد، پس تخمین‌گر حجم کار زمان را بالا می‌برد.
  • نیم‌رخ ساعتی ``hour_scores`` — ساعت‌هایی که این فرد در آن‌ها بهتر جواب می‌دهد،
    تا بلوک‌های سنگین همان‌جا بنشینند.

هر دو با کف و سقف محدود می‌شوند: بازخورد یک سیگنال نویزی است و نباید اجازه بدهیم
چند امتیاز بد، برنامه را بی‌معنا کند.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, Protocol, runtime_checkable

#: ضریب بازدهی در این بازه کلمپ می‌شود؛ کمتر از ۱ یعنی «وقت بیشتری لازم دارد».
MIN_EFFICIENCY = 0.7
MAX_EFFICIENCY = 1.3
NEUTRAL_EFFICIENCY = 1.0


@dataclass(frozen=True)
class EfficiencyProfile:
    student_id: int
    #: ضریب کلی؛ در نبود بازخورد برابر ۱ است و هیچ اثری نمی‌گذارد.
    efficiency: float = NEUTRAL_EFFICIENCY
    #: ضریب به‌تفکیک درس؛ کلیدهای غایب یعنی «از ضریب کلی استفاده کن».
    by_subject: Mapping[str, float] = field(default_factory=dict)
    #: امتیاز نرمال‌شده‌ی هر ساعت روز (۰ تا ۲۳) در بازه‌ی ۰ تا ۱؛ خالی یعنی بی‌تفاوت.
    hour_scores: Mapping[int, float] = field(default_factory=dict)
    sample_size: int = 0

    def for_subject(self, subject: str) -> float:
        return float(self.by_subject.get(subject, self.efficiency))

    def score_for_hour(self, hour: int) -> float:
        """۰٫۵ یعنی «اطلاعی نداریم»؛ بالاتر بهتر، پایین‌تر بدتر."""
        if not self.hour_scores:
            return 0.5
        return float(self.hour_scores.get(hour, 0.5))

    @classmethod
    def neutral(cls, student_id: int) -> 'EfficiencyProfile':
        return cls(student_id=student_id)


@runtime_checkable
class EfficiencyProfileReader(Protocol):
    def get(self, student_id: int) -> EfficiencyProfile:
        ...

    def get_many(self, student_ids) -> dict[int, EfficiencyProfile]:
        """نیم‌رخ گروهی — یک کوئری برای کل بچ برنامه‌ریزی."""
        ...
