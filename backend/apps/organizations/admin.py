from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Organization


@admin.register(Organization)
class OrganizationAdmin(ModelAdmin):
    """Админка для организаций."""

    list_display = ["name", "slug", "plan", "status", "max_kitchens", "max_users", "mrr"]
    list_filter = ["plan", "status"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ["created_at", "updated_at"]
    fieldsets = (
        (None, {"fields": ("name", "slug", "plan", "status")}),
        ("Лимиты", {"fields": ("max_kitchens", "max_users", "mrr")}),
        ("Контакты", {"fields": ("contact_name", "phone", "email", "address")}),
        ("Настройки", {"fields": ("currency", "tax_rate", "low_stock_threshold")}),
        ("Даты", {"fields": ("created_at", "updated_at")}),
    )
