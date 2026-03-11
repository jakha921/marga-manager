from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Kitchen


@admin.register(Kitchen)
class KitchenAdmin(ModelAdmin):
    """Админка для кухонь."""

    list_display = ["name", "organization", "is_active", "created_at"]
    list_filter = ["is_active", "organization"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "updated_at"]
