"""نگاشت خطای دامنه به پاسخ HTTP یکپارچه + BasePlanningView.

قرارداد خطا (الهام از RFC 7807):
    {"error": {"code": "...", "message": "...", "detail": "...", "meta": {...}}}

handler فقط به view های اپ Planning اعمال می‌شود (از طریق ``BasePlanningView``) تا
رفتار سایر اپ‌ها تغییر نکند. مهم‌ترین سود عملی: کلاینت می‌تواند به کد ماشین‌خوان
مثل ``IMMUTABLE_EVENT_VIOLATION`` واکنش دقیق نشان دهد، نه به متن پیام.
"""
from __future__ import annotations

from rest_framework.response import Response
from rest_framework.views import APIView, exception_handler as drf_default_handler

from ...shared.domain.errors import DomainError


def planning_exception_handler(exc, context):
    if isinstance(exc, DomainError):
        return Response({'error': exc.to_dict()}, status=exc.http_status)

    response = drf_default_handler(exc, context)
    if response is not None and not (
        isinstance(response.data, dict) and 'error' in response.data
    ):
        code = getattr(exc, 'default_code', 'error')
        response.data = {
            'error': {'code': str(code).upper(), 'message': _extract_message(response.data)}
        }
    return response


def _extract_message(data) -> str:
    if isinstance(data, dict):
        if 'detail' in data:
            return str(data['detail'])
        for value in data.values():
            if isinstance(value, (list, tuple)) and value:
                return str(value[0])
            return str(value)
    if isinstance(data, (list, tuple)) and data:
        return str(data[0])
    return 'خطا در پردازش درخواست.'


class BasePlanningView(APIView):
    """پایه‌ی view های Planning؛ handler خطای دامنه را محدود به همین view ها می‌کند."""

    def get_exception_handler(self):
        return planning_exception_handler
