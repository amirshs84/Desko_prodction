"""View فهرست مدل‌های فعال — برای انتخاب مدل هنگام ساخت مکالمه در کلاینت."""
from __future__ import annotations

from rest_framework.response import Response

from ....container import get_container
from ....domain.enums import Capability
from ..errors import BaseAIView
from ..serializers import model_out


class ModelListView(BaseAIView):
    def get(self, request):
        models = get_container().model_repo.list_active(capability=Capability.CHAT)
        return Response({"items": [model_out(m) for m in models]})
