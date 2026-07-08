"""صفحه‌ی وب ساده‌ی چت (dev) — یک SPA تک‌فایلی که خود Django سرو می‌کند.

این صفحه صرفاً برای تست دستی مسیر انتها-به-انتها است (نه بخشی از API). model_id
مدل فعال را از رجیستری به قالب تزریق می‌کند تا فرانت بدون اندپوینت جداگانه‌ی
«لیست مدل‌ها» بتواند مکالمه بسازد.
"""
from __future__ import annotations

from django.shortcuts import render

from ...infrastructure.persistence.models import AIModelModel


def chat_page(request):
    model = (
        AIModelModel.objects.filter(is_active=True)
        .order_by("-priority", "key")
        .first()
    )
    return render(
        request,
        "ai_chat.html",
        {
            "model_id": str(model.id) if model else "",
            "model_name": model.display_name if model else "",
        },
    )
