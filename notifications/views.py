from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from notifications.models import UserNotification, UserDevice
from notifications.services import log_notification_action
from django.shortcuts import get_object_or_404

class NotificationInboxViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API برای دریافت لیست نوتیفیکیشن‌های کاربر (اینباکس).
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return UserNotification.objects.filter(user=self.request.user).order_by('-created_at')
        
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # برای سادگی در اینجا به صورت دیکشنری دستی خروجی می‌دهیم. 
        # در پروژه‌های واقعی از Serializer استفاده می‌شود.
        data = []
        for un in queryset[:50]: # pagination is better here
            event = un.event
            template = event.template
            payload = {
                "id": un.id,
                "title": template.title_template, # In real app, format with event.context_data
                "body": template.body_template,
                "icon": event.override_payload.get('icon', template.default_icon) if event.override_payload else template.default_icon,
                "image": event.override_payload.get('image', template.default_image) if event.override_payload else template.default_image,
                "url": event.override_payload.get('url', template.default_url) if event.override_payload else template.default_url,
                "action_buttons": template.default_action_buttons,
                "is_read": un.is_read,
                "created_at": un.created_at
            }
            data.append(payload)
            
        return Response(data)

class NotificationTrackView(views.APIView):
    """
    API برای ثبت رویدادهای Delivered, Clicked, Dismissed
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        # بررسی اینکه نوتیفیکیشن متعلق به کاربر فعلی است
        un = get_object_or_404(UserNotification, id=pk, user=request.user)
        
        action = request.data.get('action') # 'DELIVERED', 'CLICKED', 'DISMISSED'
        if action not in ['DELIVERED', 'CLICKED', 'DISMISSED']:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        
        if action == 'CLICKED':
            un.is_read = True
            un.save(update_fields=['is_read'])
            
        log_notification_action(
            user_notification_id=un.id,
            status=action,
            metadata=request.data.get('metadata', {})
        )
        return Response({"status": "tracked"})

class RegisterDeviceView(views.APIView):
    """
    API برای ثبت توکن پوش نوتیفیکیشن اندروید/وب
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token')
        device_type = request.data.get('device_type', 'WEB')
        
        if not token:
            return Response({"error": "token is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        device, created = UserDevice.objects.update_or_create(
            push_token=token,
            defaults={
                'user': request.user,
                'device_type': device_type,
                'is_active': True
            }
        )
        return Response({"status": "registered", "created": created})
