from rest_framework.permissions import BasePermission


class IsManager(BasePermission):
    """
    Permission to only allow managers to access the view.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and
            request.user.profile.role == 'manager'
        )


class IsSuperAdmin(BasePermission):
    """
    Permission to only allow superadmins to access the view.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and
            request.user.profile.is_superadmin
        )
