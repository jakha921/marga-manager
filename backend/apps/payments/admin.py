from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import AuditLog, Order, PaymeTransaction, PlanConfig


@admin.register(AuditLog)
class AuditLogAdmin(ModelAdmin):
    list_display = ["event_type", "target_type", "target_id", "organization", "created_at"]
    list_filter = ["event_type", "created_at"]
    search_fields = ["organization__name"]
    readonly_fields = [
        "event_type",
        "actor",
        "organization",
        "target_type",
        "target_id",
        "old_value",
        "new_value",
        "metadata",
        "created_at",
    ]
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


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


@admin.register(PlanConfig)
class PlanConfigAdmin(ModelAdmin):
    list_display = ["plan", "price_display", "max_kitchens", "max_users", "is_active"]

    @admin.display(description="Цена (UZS)")
    def price_display(self, obj):
        return f"{obj.price // 100:,} UZS"


from .models import Subscription  # noqa: E402


@admin.register(Subscription)
class SubscriptionAdmin(ModelAdmin):
    list_display = ["id", "organization", "plan", "status", "started_at", "expires_at"]
    list_filter = ["plan", "status"]
    search_fields = ["organization__name"]
    readonly_fields = [
        "organization",
        "plan",
        "amount",
        "started_at",
        "expires_at",
        "order",
        "status",
        "created_at",
        "updated_at",
    ]
    raw_id_fields = []

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
