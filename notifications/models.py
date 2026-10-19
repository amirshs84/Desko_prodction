import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationTemplate(models.Model):
    name = models.CharField(max_length=100, unique=True, help_text="e.g. CHALLENGE_INVITE")
    title_template = models.CharField(max_length=255, help_text="Supports emoji (utf8mb4)")
    body_template = models.TextField()
    default_icon = models.URLField(blank=True, null=True)
    default_image = models.URLField(blank=True, null=True)
    default_url = models.CharField(max_length=500, blank=True, null=True)
    default_action_buttons = models.JSONField(blank=True, null=True, help_text="List of dicts for buttons")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class NotificationEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(NotificationTemplate, on_delete=models.CASCADE, related_name="events")
    context_data = models.JSONField(blank=True, null=True, help_text="Variables to inject into templates")
    override_payload = models.JSONField(blank=True, null=True, help_text="Overrides for icon, image, url, etc.")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Event {self.id} for {self.template.name}"


class UserNotification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    event = models.ForeignKey(NotificationEvent, on_delete=models.CASCADE, related_name="user_notifications")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notif for {self.user} - Event: {self.event.template.name}"


class NotificationTrackingLog(models.Model):
    STATUS_CHOICES = (
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('CLICKED', 'Clicked'),
        ('DISMISSED', 'Dismissed'),
    )
    user_notification = models.ForeignKey(UserNotification, on_delete=models.CASCADE, related_name="tracking_logs")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(blank=True, null=True, help_text="Extra data like device type, clicked button ID")

    class Meta:
        indexes = [
            models.Index(fields=['user_notification', 'status']),
        ]

    def __str__(self):
        return f"{self.user_notification.id} - {self.status}"


class UserDevice(models.Model):
    DEVICE_TYPES = (
        ('WEB', 'Web'),
        ('ANDROID', 'Android'),
        ('IOS', 'iOS'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="devices")
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    push_token = models.TextField(unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.device_type} token for {self.user}"
