"""هسته‌ی زمان‌بندی: وضعیت، کاندیدها، تابع هزینه، سازنده و پالایشگر.

خط لوله سه مرحله دارد و هر مرحله یک ماژول است:

  ۱. ``state``      — وضعیت جاری چیدمان و قیدهای سخت
  ۲. ``candidates`` — تولید جایگاه‌های ممکن برای یک آیتم
  ۳. ``cost``       — نمره‌دهی به یک چیدمان (قیدهای نرم)
  ۴. ``constructor``— ساخت اولیه با اولویت و جابه‌جایی اجباری
  ۵. ``refiner``    — بهبود تدریجی با جست‌وجوی محلی

همه خالص‌اند: نه Django، نه ساعت سیستم، نه I/O.
"""
from .candidates import Candidate, generate_candidates
from .constructor import ConstructionResult, construct
from .cost import CostWeights, schedule_cost
from .refiner import refine
from .state import Placement, ScheduleState

__all__ = [
    'Candidate',
    'ConstructionResult',
    'CostWeights',
    'Placement',
    'ScheduleState',
    'construct',
    'generate_candidates',
    'refine',
    'schedule_cost',
]
