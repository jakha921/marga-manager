from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from unfold.admin import ModelAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    """Админка для пользователей."""

    list_display = ["username", "full_name", "role", "organization", "is_active"]
    list_filter = ["role", "organization", "is_active"]
    search_fields = ["username", "full_name", "email"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Marga", {"fields": ("full_name", "role", "organization")}),
    )
