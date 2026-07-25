from rest_framework import generics, status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CalendarEvent
from .serializers import CalendarEventGroupPatchSerializer, CalendarEventSerializer


class CalendarEventListCreateView(generics.ListCreateAPIView):
    """لیست رویدادهای تقویم کاربر یا ایجاد رویداد جدید (پشتیبانی از bulk create)"""
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CalendarEvent.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=many)
        serializer.is_valid(raise_exception=True)

        if many:
            validated = serializer.validated_data
            events = [
                CalendarEvent(user=request.user, **item)
                for item in validated
            ]
            CalendarEvent.objects.bulk_create(events, ignore_conflicts=True)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CalendarEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """دریافت، ویرایش یا حذف یک رویداد با client_id"""
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'client_id'

    def get_queryset(self):
        return CalendarEvent.objects.filter(user=self.request.user)


class CalendarEventGroupView(views.APIView):
    """حذف یا ویرایش همه رویدادهای یک گروه"""
    permission_classes = [IsAuthenticated]

    def _group_qs(self, request, group_id):
        return CalendarEvent.objects.filter(
            user=request.user, group_id=group_id,
        ).exclude(group_id='')

    def delete(self, request, group_id):
        deleted, _ = self._group_qs(request, group_id).delete()
        if deleted == 0:
            return Response({'detail': 'گروه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, group_id):
        qs = self._group_qs(request, group_id)
        if not qs.exists():
            return Response({'detail': 'گروه یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CalendarEventGroupPatchSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        qs.update(**serializer.validated_data)
        return Response({'updated': qs.count()}, status=status.HTTP_200_OK)
