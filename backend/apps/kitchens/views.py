from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.core.audit import create_audit_log
from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsTenantAdminOrReadOnly
from apps.payments.models import AuditLog

from .models import Kitchen
from .serializers import KitchenSerializer


class KitchenViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD кухонь. TENANT_ADMIN — полный доступ, KITCHEN_USER — чтение."""

    queryset = Kitchen.objects.select_related("organization").all()
    serializer_class = KitchenSerializer
    permission_classes = [IsTenantAdminOrReadOnly]
    filterset_fields = ["is_active"]
    search_fields = ["name"]

    def perform_create(self, serializer):
        org = self.request.user.organization
        if self.request.user.role != "SUPER_ADMIN" and org and not org.can_add_kitchen():
            raise PermissionDenied(f"Достигнут лимит кухонь ({org.max_kitchens}).")
        super().perform_create(serializer)
        instance = serializer.instance
        create_audit_log(
            AuditLog.EventType.KITCHEN_CREATED,
            actor=self.request.user,
            organization=instance.organization,
            target_type="Kitchen",
            target_id=instance.id,
            new_value={"name": instance.name},
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        create_audit_log(
            AuditLog.EventType.KITCHEN_UPDATED,
            actor=self.request.user,
            organization=instance.organization,
            target_type="Kitchen",
            target_id=instance.id,
            new_value={"name": instance.name},
        )

    def perform_destroy(self, instance):
        create_audit_log(
            AuditLog.EventType.KITCHEN_DELETED,
            actor=self.request.user,
            organization=instance.organization,
            target_type="Kitchen",
            target_id=instance.id,
            old_value={"name": instance.name},
        )
        instance.delete()
