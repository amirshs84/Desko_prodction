"""نگاشت URL های اپ AI.

قرارداد مسیرها با پیشوند ``api/ai/`` مونت می‌شود (در desko_backend/urls.py).
از ``<uuid:...>`` استفاده می‌کنیم تا شناسه‌ها در سطح روتر اعتبارسنجی شوند.
"""
from __future__ import annotations

from django.urls import path

from .views import (
    AttachmentDetailView,
    AttachmentUploadView,
    ConversationActionView,
    ConversationDetailView,
    ConversationListCreateView,
    MessageActionView,
    MessageListView,
    MessageStreamView,
    ModelListView,
    SendMessageView,
)

app_name = "ai"

urlpatterns = [
    path("models/", ModelListView.as_view(), name="model-list"),
    # مکالمه‌ها
    path("conversations/", ConversationListCreateView.as_view(), name="conversation-list"),
    path(
        "conversations/<uuid:conversation_id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
    path(
        "conversations/<uuid:conversation_id>/actions/<str:action>/",
        ConversationActionView.as_view(),
        name="conversation-action",
    ),
    # پیام‌ها (زیرمنبع مکالمه برای خواندن و ارسال)
    path(
        "conversations/<uuid:conversation_id>/messages/",
        MessageListView.as_view(),
        name="message-list",
    ),
    path(
        "conversations/<uuid:conversation_id>/messages/send/",
        SendMessageView.as_view(),
        name="message-send",
    ),
    # استریم زنده‌ی تولید پاسخ (SSE)
    path(
        "messages/<uuid:message_id>/stream/",
        MessageStreamView.as_view(),
        name="message-stream",
    ),
    # اکشن‌های تک‌پیام (edit/delete/retry/regenerate)
    path(
        "messages/<uuid:message_id>/",
        MessageActionView.as_view(),
        name="message-detail",
    ),
    path(
        "messages/<uuid:message_id>/actions/<str:action>/",
        MessageActionView.as_view(),
        name="message-action",
    ),
    # پیوست‌ها
    path("attachments/", AttachmentUploadView.as_view(), name="attachment-upload"),
    path(
        "attachments/<uuid:attachment_id>/",
        AttachmentDetailView.as_view(),
        name="attachment-detail",
    ),
]
