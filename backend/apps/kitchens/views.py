from rest_framework import viewsets

from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsTenantAdminOrReadOnly

from .models import Kitchen
from .serializers import KitchenSerializer


class KitchenViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD кухонь. TENANT_ADMIN — полный доступ, KITCHEN_USER — чтение."""

    queryset = Kitchen.objects.all()
    serializer_class = KitchenSerializer
    permission_classes = [IsTenantAdminOrReadOnly]
    filterset_fields = ["is_active"]
    search_fields = ["name"]
