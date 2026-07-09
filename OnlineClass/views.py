from rest_framework import status, views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.models import UserProfile
from api.permissions import IsManager

from . import services
from .serializers import (
    AssignOnlineClassSerializer,
    JoinOnlineClassSerializer,
    OnlineClassSerializer,
    StudentOnlineClassSerializer,
    UpdateOnlineClassSerializer,
)


def _get_profile(request) -> UserProfile | None:
    try:
        return request.user.profile
    except UserProfile.DoesNotExist:
        return None


def _service_error_response(exc: services.OnlineClassServiceError):
    return Response({'error': str(exc)}, status=exc.status_code)


class ManagerOnlineClassListCreateView(views.APIView):
    """لیست و تخصیص کلاس آنلاین به کلاس‌های درسی مدرسه."""

    permission_classes = [IsAuthenticated, IsManager]

    def get(self, request):
        profile = _get_profile(request)
        if not profile or not profile.school:
            return Response({'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'}, status=status.HTTP_400_BAD_REQUEST)

        qs = services.list_manager_online_classes(profile.school)
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ('true', '1', 'yes'))

        serializer = OnlineClassSerializer(qs, many=True)
        return Response({
            'online_classes': serializer.data,
            'count': qs.count(),
            'active_count': qs.filter(is_active=True).count(),
        })

    def post(self, request):
        profile = _get_profile(request)
        if not profile or not profile.school:
            return Response({'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AssignOnlineClassSerializer(
            data=request.data,
            context={'school': profile.school},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        school_class = serializer.context['school_class']
        try:
            online_class = services.assign_online_class_to_school_class(
                school=profile.school,
                school_class=school_class,
                created_by=request.user,
                title=serializer.validated_data.get('title'),
                max_users=serializer.validated_data.get('max_users'),
            )
        except services.OnlineClassServiceError as exc:
            return _service_error_response(exc)

        return Response(
            OnlineClassSerializer(online_class).data,
            status=status.HTTP_201_CREATED,
        )


class ManagerOnlineClassDetailView(views.APIView):
    """دریافت، ویرایش یا حذف کلاس آنلاین."""

    permission_classes = [IsAuthenticated, IsManager]

    def _get_object(self, request, online_class_id):
        profile = _get_profile(request)
        if not profile or not profile.school:
            return None, Response({'error': 'مدیر به هیچ مدرسه‌ای متصل نیست'}, status=status.HTTP_400_BAD_REQUEST)
        online_class = services.get_manager_online_class(profile.school, online_class_id)
        if not online_class:
            return None, Response({'error': 'کلاس آنلاین یافت نشد'}, status=status.HTTP_404_NOT_FOUND)
        return online_class, None

    def get(self, request, online_class_id):
        online_class, error = self._get_object(request, online_class_id)
        if error:
            return error
        return Response(OnlineClassSerializer(online_class).data)

    def patch(self, request, online_class_id):
        online_class, error = self._get_object(request, online_class_id)
        if error:
            return error

        serializer = UpdateOnlineClassSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            updated = services.update_online_class(online_class, **serializer.validated_data)
        except services.OnlineClassServiceError as exc:
            return _service_error_response(exc)
        return Response(OnlineClassSerializer(updated).data)

    def delete(self, request, online_class_id):
        online_class, error = self._get_object(request, online_class_id)
        if error:
            return error
        services.delete_online_class(online_class)
        return Response(status=status.HTTP_204_NO_CONTENT)


class StudentOnlineClassListView(views.APIView):
    """لیست کلاس‌های دانش‌آموز بر اساس عضویت در کلاس درسی (حتی بدون لینک آنلاین)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_profile(request)
        if not profile:
            return Response({'error': 'پروفایل کاربر یافت نشد'}, status=status.HTTP_400_BAD_REQUEST)
        if profile.role != 'student':
            return Response({'error': 'فقط دانش‌آموزان به این بخش دسترسی دارند'}, status=status.HTTP_403_FORBIDDEN)

        items = services.list_student_online_classes(profile)
        serializer = StudentOnlineClassSerializer(items, many=True)
        return Response({
            'online_classes': serializer.data,
            'count': len(items),
        })


class StudentOnlineClassJoinView(views.APIView):
    """دریافت لینک ورود به کلاس آنلاین."""

    permission_classes = [IsAuthenticated]

    def post(self, request, online_class_id):
        profile = _get_profile(request)
        if not profile:
            return Response({'error': 'پروفایل کاربر یافت نشد'}, status=status.HTTP_400_BAD_REQUEST)

        online_class = services.get_student_online_class(profile, online_class_id)
        if not online_class and profile.role == 'manager' and profile.school:
            online_class = services.get_manager_online_class(profile.school, online_class_id)

        if not online_class:
            return Response({'error': 'کلاس آنلاین یافت نشد'}, status=status.HTTP_404_NOT_FOUND)

        if profile.role == 'student' and not services.student_is_enrolled(profile, online_class):
            return Response({'error': 'شما عضو این کلاس نیستید'}, status=status.HTTP_403_FORBIDDEN)

        force_refresh = request.query_params.get('refresh', '').lower() in ('true', '1', 'yes')
        try:
            login_url = services.get_login_url(
                online_class=online_class,
                profile=profile,
                force_refresh=force_refresh,
            )
        except services.OnlineClassServiceError as exc:
            return _service_error_response(exc)

        return Response(JoinOnlineClassSerializer({'login_url': login_url}).data)
