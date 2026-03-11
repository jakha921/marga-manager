from rest_framework import viewsets

from apps.core.permissions import IsSuperAdmin

from .models import Organization
from .serializers import OrganizationSerializer


class OrganizationViewSet(viewsets.ModelViewSet):
    """CRUD организаций. Только для SUPER_ADMIN."""

    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [IsSuperAdmin]
    search_fields = ["name", "slug"]
    filterset_fields = ["plan", "status"]
