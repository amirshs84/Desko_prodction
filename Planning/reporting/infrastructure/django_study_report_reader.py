"""آداپتور خواندن جلسات مطالعه از مدل‌های اپ ``api``.

تنها فایلی در کانتکست reporting که به ``StudySession`` وابسته است.
"""
from __future__ import annotations

from datetime import datetime

from django.utils import timezone

from api.models import StudySession

from ..application.ports.study_report_reader import SessionRecord


class DjangoStudyReportReader:
    def list_sessions(
        self, user_id: int, *, since: datetime | None = None,
    ) -> list[SessionRecord]:
        queryset = (
            StudySession.objects.filter(user_id=user_id)
            .select_related('subject')
            .order_by('-start_time', '-id')
        )
        if since is not None:
            queryset = queryset.filter(start_time__gte=since)
        return [self._to_record(row) for row in queryset]

    @staticmethod
    def _to_record(row: StudySession) -> SessionRecord:
        start = row.start_time
        if timezone.is_naive(start):
            start = timezone.make_aware(start, timezone.get_current_timezone())
        end = row.end_time
        if end is not None and timezone.is_naive(end):
            end = timezone.make_aware(end, timezone.get_current_timezone())
        subject = row.subject
        return SessionRecord(
            id=row.id,
            subject_name=subject.name if subject else 'بدون موضوع',
            subject_color=(subject.color_code if subject else '') or '#10b981',
            description=row.description or '',
            start_time=start,
            end_time=end,
            duration_seconds=int(row.duration_seconds or 0),
        )
