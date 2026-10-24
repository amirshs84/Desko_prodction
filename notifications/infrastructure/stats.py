"""تجمیع روزانه‌ی رویدادها برای داشبورد/ادمین (کلیک، رد، باز شدن و ... به تفکیک دسته)."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from .persistence.models import DailyStatsModel, InteractionEventModel


def aggregate_day(day: date) -> int:
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(day, time.min), tz)
    end = start + timedelta(days=1)
    rows = (
        InteractionEventModel.objects.filter(occurred_at__gte=start, occurred_at__lt=end)
        .values("category_key", "type", "action_id")
        .annotate(n=Count("id"))
    )
    with transaction.atomic():
        DailyStatsModel.objects.filter(date=day).delete()
        DailyStatsModel.objects.bulk_create(
            [
                DailyStatsModel(
                    date=day,
                    category_key=r["category_key"],
                    event_type=r["type"],
                    action_id=r["action_id"],
                    count=r["n"],
                )
                for r in rows
            ]
        )
    return len(rows)


def aggregate_recent() -> int:
    """امروز و دیروز (رویدادهای دیررسیده‌ی آفلاین روز قبل را هم پوشش می‌دهد)."""
    today = timezone.localdate()
    return aggregate_day(today) + aggregate_day(today - timedelta(days=1))
