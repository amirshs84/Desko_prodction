"""View های پیوست — آپلود (multipart) و دریافت وضعیت."""
from __future__ import annotations

from uuid import UUID

from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from ....container import get_container
from ....application.commands.attachment_commands import UploadAttachmentCommand
from ....shared.domain.errors import ValidationError
from ..context import build_request_context
from ..errors import BaseAIView
from ..serializers import attachment_out


class AttachmentUploadView(BaseAIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ctx = build_request_context(request)
        uploaded = request.FILES.get("file")
        if uploaded is None:
            raise ValidationError("فایلی ارسال نشده است (فیلد «file»).")
        cmd = UploadAttachmentCommand(
            filename=uploaded.name,
            content_type=uploaded.content_type or "application/octet-stream",
            data=uploaded.read(),
        )
        dto = get_container().attachment_service.upload(cmd, ctx)
        return Response(attachment_out(dto), status=status.HTTP_201_CREATED)


class AttachmentDetailView(BaseAIView):
    def get(self, request, attachment_id: UUID):
        ctx = build_request_context(request)
        dto = get_container().attachment_service.get(attachment_id, ctx)
        return Response(attachment_out(dto))
