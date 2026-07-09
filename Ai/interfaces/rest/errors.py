"""نگاشت خطای دامنه به پاسخ HTTP یکپارچه + BaseAIView.

قرارداد خطا (الهام از RFC 7807):
    {"error": {"code": "...", "message": "...", "detail": "...", "meta": {...}}}

با یک exception handler اختصاصی، ``DomainError`` (framework-agnostic) به کد وضعیت
و بدنه‌ی یکنواخت تبدیل می‌شود. این handler فقط به view های AI اعمال می‌شود (از
طریق ``BaseAIView``) تا رفتار سایر اپ‌ها تغییر نکند.
"""
from __future__ import annotations

from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView, exception_handler as drf_default_handler

from ...shared.domain.errors import DomainError


class EventStreamRenderer(BaseRenderer):
    """Renderer برای مذاکرهٔ محتوا روی اندپوینت SSE.

    وقتی کلاینت ``Accept: text/event-stream`` می‌فرستد و خطا رخ می‌دهد، DRF بدون
    این renderer پاسخ 406 می‌دهد. پاسخ خطا به‌صورت JSON داخل content-type استریم
    برگردانده می‌شود تا fetch کلاینت بتواند آن را parse کند.
    """

    media_type = "text/event-stream"
    format = "event-stream"
    charset = None

    def render(self, data, accepted_media_type=None, renderer_context=None):
        import json

        return json.dumps(data, ensure_ascii=False).encode("utf-8")


def ai_exception_handler(exc, context):
    if isinstance(exc, DomainError):
        return Response({"error": exc.to_dict()}, status=exc.http_status)

    # سایر استثناها به handler پیش‌فرض DRF واگذار می‌شوند، اما بدنه را در همان
    # پاکت «error» یکنواخت می‌کنیم تا کلاینت یک شکل ثابت ببیند.
    response = drf_default_handler(exc, context)
    if response is not None and not (
        isinstance(response.data, dict) and "error" in response.data
    ):
        code = getattr(exc, "default_code", "error")
        response.data = {
            "error": {"code": str(code).upper(), "message": _extract_message(response.data)}
        }
    return response


def _extract_message(data) -> str:
    if isinstance(data, dict):
        if "detail" in data:
            return str(data["detail"])
        # اولین پیام خطای فیلدی.
        for value in data.values():
            if isinstance(value, (list, tuple)) and value:
                return str(value[0])
            return str(value)
    if isinstance(data, (list, tuple)) and data:
        return str(data[0])
    return "خطا در پردازش درخواست."


class BaseAIView(APIView):
    """پایه‌ی همه‌ی view های AI؛ handler خطای دامنه را محدود به همین view ها می‌کند."""

    def get_exception_handler(self):
        return ai_exception_handler
