from rest_framework import viewsets

from apps.core.permissions import IsSuperAdmin, IsTenantAdmin

from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """CRUD организаций. SUPER_ADMIN — полный доступ, TENANT_ADMIN — чтение/обновление своей."""

    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    search_fields = ["name", "slug"]
    filterset_fields = ["plan", "status"]

    def get_permissions(self):
        if self.action in ("list", "retrieve", "partial_update", "update"):
            return [IsTenantAdmin()]
        return [IsSuperAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "SUPER_ADMIN":
            return qs
        # TENANT_ADMIN видит только свою организацию
        return qs.filter(pk=user.organization_id)
