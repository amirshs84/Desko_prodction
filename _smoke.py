import os

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'desko_backend.settings')
django.setup()

from Planning.intervention.domain.entities.plan_request import PlanRequest
from Planning.intervention.domain.enums import IntensityLevel
from Planning.intervention.domain.services.planning_engine import PlanningEngine
from Planning.intervention.domain.value_objects.plan_window import PlanWindow
from Planning.intervention.domain.value_objects.subject_demand import SubjectDemand
from Planning.intervention.infrastructure.policies import StaticBurnoutPolicy
from Planning.intervention.infrastructure.weights import EqualDistributionWeightCalculator
from Planning.scheduling.domain.value_objects.jalali_date import JalaliDate

window = PlanWindow(start=JalaliDate(1404, 7, 1), end=JalaliDate(1404, 7, 5))
request = PlanRequest(
    window=window,
    demands=(
        SubjectDemand.of_minutes('ریاضی', 480, priority=5),
        SubjectDemand.of_minutes('ادبیات', 240, priority=2),
    ),
    intensity=IntensityLevel.NORMAL,
)
engine = PlanningEngine(
    weights=EqualDistributionWeightCalculator(), burnout=StaticBurnoutPolicy(),
)
preview = engine.plan(request, existing_events={7: []})
draft = preview.drafts[0]
print('blocks', len(draft.blocks))
print('alloc', dict(draft.allocated_by_subject))
print('shortfall', draft.shortfall_minutes, 'capacity', draft.capacity_minutes)
for block in draft.blocks:
    print('  ', block)
for warning in draft.warnings:
    print('  !', warning.code, warning.message)

again = engine.plan(request, existing_events={7: []}).drafts[0]
print('deterministic:', [str(b) for b in again.blocks] == [str(b) for b in draft.blocks])
