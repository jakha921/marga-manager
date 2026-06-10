from rest_framework import permissions


class IsSuperAdmin(permissions.BasePermission):
    """Доступ только для SUPER_ADMIN."""

    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "SUPER_ADMIN"


class IsTenantAdmin(permissions.BasePermission):
    """Доступ только для TENANT_ADMIN и выше."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ("SUPER_ADMIN", "TENANT_ADMIN")


class IsTenantAdminOrReadOnly(permissions.BasePermission):
    """TENANT_ADMIN — полный доступ, остальные — только чтение."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ("SUPER_ADMIN", "TENANT_ADMIN")


class IsKitchenUserOrAbove(permissions.BasePermission):
    """Доступ для всех аутентифицированных пользователей организации."""

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsOrgActive(permissions.BasePermission):
    """Блокирует доступ пользователям из SUSPENDED организации (SUPER_ADMIN обходит)."""

    message = "Организация приостановлена. Обратитесь к администратору."

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return True  # другие классы разберутся
        if request.user.role == "SUPER_ADMIN":
            return True
        org_id = getattr(request.user, "organization_id", None)
        if not org_id:
            return True
        from apps.organizations.models import Organization

        try:
            org = Organization.objects.get(pk=org_id)
        except Organization.DoesNotExist:
            return True
        return org.status != "SUSPENDED"
