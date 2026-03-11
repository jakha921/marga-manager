from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import OperationEntry


@admin.register(OperationEntry)
class OperationEntryAdmin(ModelAdmin):
    """Админка для операций."""

    list_display = ["type", "date", "time", "kitchen", "product", "quantity", "unit", "price"]
    list_filter = ["type", "kitchen", "date", "organization"]
    search_fields = ["product__name", "product__code"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "date"
    raw_id_fields = ["product", "kitchen", "to_kitchen"]
