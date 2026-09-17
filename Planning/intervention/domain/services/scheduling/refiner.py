"""پالایش چیدمان با جست‌وجوی محلی — تپه‌نوردی کراندار و دترمینیستیک.

درج حریصانه‌ی مرحله‌ی قبل هر تصمیم را جداگانه بهینه می‌گیرد و به همین دلیل معمولاً
به یک بهینه‌ی محلیِ نه‌چندان خوب می‌رسد: آیتم اول بهترین جا را برمی‌دارد و آیتم پنجم
با آنچه مانده می‌سازد. اینجا چیدمان به‌عنوان یک کل دیده می‌شود و حرکت‌های کوچک فقط
وقتی پذیرفته می‌شوند که هزینه‌ی کل را پایین بیاورند.

RNG دانه‌دار است، پس همان ورودی همان خروجی را می‌دهد. بدون این خاصیت، مشاور در
پیش‌نمایش یک برنامه می‌دید و پس از انتشار برنامه‌ای دیگر.
"""
from __future__ import annotations

import random
from typing import Sequence

from .....scheduling.domain.value_objects.time_range import TimeRange
from ...ports.efficiency_profile import EfficiencyProfile
from ...value_objects.schedule_item import ScheduleItem
from .candidates import generate_candidates
from .cost import DEFAULT_WEIGHTS, CostWeights, schedule_cost
from .state import Placement, ScheduleState

MAX_ITERATIONS = 300
STAGNATION_LIMIT = 50
#: چند کاندید برای هر حرکت بررسی شود؛ بیش از این، سود ناچیز و هزینه زیاد است.
CANDIDATES_PER_MOVE = 6


def refine(
    state: ScheduleState,
    *,
    rng: random.Random,
    unplaced: Sequence[ScheduleItem] = (),
    weights: CostWeights = DEFAULT_WEIGHTS,
    profile: EfficiencyProfile | None = None,
    max_iterations: int = MAX_ITERATIONS,
) -> float:
    """چیدمان را در جا بهبود می‌دهد و هزینه‌ی نهایی را برمی‌گرداند."""
    current = schedule_cost(state, unplaced=unplaced, weights=weights, profile=profile)
    stagnant = 0

    for _ in range(max_iterations):
        placements = state.placements
        if not placements:
            break

        move = rng.random()
        improved = (
            _try_relocate(state, placements, rng, unplaced, weights, profile, current)
            if move < 0.65
            else _try_swap(state, placements, rng, unplaced, weights, profile, current)
        )
        if improved is None:
            stagnant += 1
        else:
            current = improved
            stagnant = 0
        if stagnant >= STAGNATION_LIMIT:
            break
    return current


def _try_relocate(
    state: ScheduleState,
    placements: Sequence[Placement],
    rng: random.Random,
    unplaced: Sequence[ScheduleItem],
    weights: CostWeights,
    profile: EfficiencyProfile | None,
    current: float,
) -> float | None:
    """یک بلوک را بردار و جای بهتری برایش پیدا کن."""
    chosen = _pick_movable(placements, rng)
    if chosen is None:
        return None

    item_id = chosen.item.item_id
    options = generate_candidates(state, chosen.item, exclude_item_id=item_id)
    options = [
        option for option in options
        if not (option.date == chosen.date and option.slot == chosen.slot)
    ]
    if not options:
        return None

    for option in _sample(options, rng, CANDIDATES_PER_MOVE):
        state.relocate(item_id, option.date, option.slot)
        cost = schedule_cost(state, unplaced=unplaced, weights=weights, profile=profile)
        if cost < current:
            return cost
        state.relocate(item_id, chosen.date, chosen.slot)
    return None


def _try_swap(
    state: ScheduleState,
    placements: Sequence[Placement],
    rng: random.Random,
    unplaced: Sequence[ScheduleItem],
    weights: CostWeights,
    profile: EfficiencyProfile | None,
    current: float,
) -> float | None:
    """دو بلوک هم‌طول جای هم بنشینند — راه ارزان خروج از بهینه‌ی محلی."""
    movable = [placement for placement in placements if not placement.item.is_pinned]
    if len(movable) < 2:
        return None

    first = movable[rng.randrange(len(movable))]
    partners = [
        other for other in movable
        if other.item.item_id != first.item.item_id
        and other.minutes == first.minutes
        and (other.date != first.date or other.slot != first.slot)
    ]
    if not partners:
        return None
    second = partners[rng.randrange(len(partners))]

    first_spot = (first.date, first.slot)
    second_spot = (second.date, second.slot)

    state.unplace(first.item.item_id)
    state.unplace(second.item.item_id)
    swapped = _place_pair(state, first, second_spot, second, first_spot)
    if not swapped:
        state.restore(tuple(placements))
        return None

    cost = schedule_cost(state, unplaced=unplaced, weights=weights, profile=profile)
    if cost < current:
        return cost
    state.restore(tuple(placements))
    return None


def _place_pair(
    state: ScheduleState,
    first: Placement,
    first_target: tuple,
    second: Placement,
    second_target: tuple,
) -> bool:
    first_date, first_slot = first_target
    second_date, second_slot = second_target
    if not state.fits(first.item, first_date, first_slot):
        return False
    state.place(first.moved_to(first_date, first_slot))
    if not state.fits(second.item, second_date, second_slot):
        state.unplace(first.item.item_id)
        return False
    state.place(second.moved_to(second_date, second_slot))
    return True


def _pick_movable(
    placements: Sequence[Placement], rng: random.Random,
) -> Placement | None:
    movable = [placement for placement in placements if not placement.item.is_pinned]
    if not movable:
        return None
    return movable[rng.randrange(len(movable))]


def _sample(options: list, rng: random.Random, limit: int) -> list:
    if len(options) <= limit:
        return list(options)
    return rng.sample(options, limit)


__all__ = ['MAX_ITERATIONS', 'refine']
