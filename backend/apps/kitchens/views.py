from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsTenantAdminOrReadOnly

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
