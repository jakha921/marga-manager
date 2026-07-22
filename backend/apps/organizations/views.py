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

    @action(detail=True, methods=["post"], permission_classes=[IsSuperAdmin])
    def extend_subscription(self, request, pk=None):
        """POST /api/organizations/{id}/extend_subscription/ {days: 30} — ручное продление."""
        from django.utils import timezone

        org = self.get_object()
        try:
            days = int(request.data.get("days", 30))
        except (TypeError, ValueError):
            days = 0
        if not 1 <= days <= 365:
            return Response({"detail": "days должен быть от 1 до 365."}, status=400)

        now = timezone.now()
        base = org.plan_expires_at if org.plan_expires_at and org.plan_expires_at > now else now
        old_expires = org.plan_expires_at
        org.plan_expires_at = base + timezone.timedelta(days=days)
        update_fields = ["plan_expires_at", "updated_at"]
        if org.status == Organization.Status.SUSPENDED:
            org.status = Organization.Status.ACTIVE
            update_fields.append("status")
        org.save(update_fields=update_fields)

        create_audit_log(
            AuditLog.EventType.PLAN_CHANGE,
            actor=request.user,
            organization=org,
            target_type="Organization",
            target_id=org.id,
            old_value={"plan_expires_at": str(old_expires) if old_expires else None},
            new_value={"plan_expires_at": str(org.plan_expires_at)},
            metadata={"reason": "manual_extension", "days": days},
        )
        return Response(
            {"plan_expires_at": org.plan_expires_at, "status": org.status},
            status=200,
        )

    @action(detail=True, methods=["get"], permission_classes=[IsSuperAdmin])
    def detail_view(self, request, pk=None):
        """GET /api/organizations/{id}/detail_view/ — детальный вид для SUPER_ADMIN."""
        org = self.get_object()
        serializer = OrganizationDetailSerializer(org, context={"request": request})
        return Response(serializer.data)
