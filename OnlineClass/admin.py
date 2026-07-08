from django.contrib import admin

from .models import OnlineClass, SkyroomLoginCache


@admin.register(OnlineClass)
class OnlineClassAdmin(admin.ModelAdmin):
    list_display = ('title', 'school_class', 'skyroom_room_id', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'skyroom_room_name', 'school_class__name', 'school_class__code')
    readonly_fields = ('skyroom_room_id', 'skyroom_room_name', 'created_at', 'updated_at')


@admin.register(SkyroomLoginCache)
class SkyroomLoginCacheAdmin(admin.ModelAdmin):
    list_display = ('online_class', 'profile', 'access_level', 'expires_at', 'updated_at')
    list_filter = ('access_level',)
    search_fields = ('profile__full_name', 'profile__phone_number', 'online_class__title')
