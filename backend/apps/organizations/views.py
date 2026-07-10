from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.audit import create_audit_log
from apps.core.permissions import IsSuperAdmin, IsTenantAdmin
from apps.payments.models import AuditLog

from .models import Organization
from .serializers import (
    AdminOrganizationSerializer,
    OrganizationDetailSerializer,
    OrganizationSerializer,
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """CRUD организаций. SUPER_ADMIN — полный доступ, TENANT_ADMIN — чтение/обновление своей."""

    queryset = Organization.objects.annotate(
        kitchen_count=Count("kitchens", distinct=True),
        user_count=Count("users", distinct=True),
    ).order_by("id")
    serializer_class = OrganizationSerializer
    search_fields = ["name", "slug"]
    filterset_fields = ["plan", "status"]

    def get_permissions(self):
        if self.action in ("list", "retrieve", "partial_update", "update"):
            return [IsTenantAdmin()]
        return [IsSuperAdmin()]

    def get_serializer_class(self):
        if self.request.user.role == "SUPER_ADMIN":
            return AdminOrganizationSerializer
        return OrganizationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "SUPER_ADMIN":
            return qs
        # TENANT_ADMIN видит только свою организацию
        return qs.filter(pk=user.organization_id)

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        instance = serializer.save()
        new_status = instance.status
        if old_status != new_status:
            event = (
                AuditLog.EventType.ORG_SUSPENDED
                if new_status == "SUSPENDED"
                else AuditLog.EventType.ORG_UNSUSPENDED
            )
            create_audit_log(
                event,
                actor=self.request.user,
                organization=instance,
                target_type="Organization",
                target_id=instance.id,
                old_value={"status": old_status},
                new_value={"status": new_status},
            )

    @action(detail=True, methods=["get"], permission_classes=[IsSuperAdmin])
    def detail_view(self, request, pk=None):
        """GET /api/organizations/{id}/detail_view/ — детальный вид для SUPER_ADMIN."""
        org = self.get_object()
        serializer = OrganizationDetailSerializer(org, context={"request": request})
        return Response(serializer.data)
