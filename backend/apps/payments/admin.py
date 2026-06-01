from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Order, PaymeTransaction


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ["id", "organization", "target_plan", "amount", "status", "created_at"]
    list_filter = ["status", "target_plan"]
    search_fields = ["organization__name"]
    readonly_fields = ["status", "paid_at", "cancelled_at", "created_at", "updated_at"]
    raw_id_fields = ["organization", "created_by"]
    date_hierarchy = "created_at"


@admin.register(PaymeTransaction)
class PaymeTransactionAdmin(ModelAdmin):
    list_display = ["id", "payme_id", "order", "state", "amount", "created_at"]
    list_filter = ["state"]
    search_fields = ["payme_id"]
    readonly_fields = [
        "payme_id",
        "state",
        "amount",
        "reason",
        "payme_time",
        "payme_create_time",
        "payme_perform_time",
        "payme_cancel_time",
        "created_at",
        "updated_at",
    ]
    raw_id_fields = ["order"]
