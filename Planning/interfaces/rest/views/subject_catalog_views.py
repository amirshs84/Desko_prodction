"""اندپوینت کاتالوگ درس مدرسه — تگ‌گذاری دروس توسط مشاور."""
from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import IsConsultant

from ....container import get_container
from ..context import build_context
from ..errors import BasePlanningView
from ..serializers import SubjectProfileWriteSerializer


class SubjectCatalogView(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]

    @property
    def service(self):
        return get_container().subject_catalog_service

    def get(self, request):
        return Response(self.service.list(context=build_context(request)))

    def post(self, request):
        serializer = SubjectProfileWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        saved = self.service.upsert(
            context=build_context(request), payload=serializer.validated_data,
        )
        return Response(saved, status=status.HTTP_201_CREATED)


class SubjectCatalogDetailView(BasePlanningView):
    permission_classes = [IsAuthenticated, IsConsultant]

    def delete(self, request, name: str):
        get_container().subject_catalog_service.delete(
            context=build_context(request), name=name,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
