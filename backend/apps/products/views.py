from rest_framework import viewsets

from apps.core.audit import create_audit_log
from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsTenantAdminOrReadOnly
from apps.payments.models import AuditLog

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


class CategoryViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD категорий."""

    queryset = Category.objects.select_related("organization").all()
    serializer_class = CategorySerializer
    permission_classes = [IsTenantAdminOrReadOnly]
    search_fields = ["name"]


class ProductViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD продуктов."""

    queryset = Product.objects.select_related("category", "organization").all()
    serializer_class = ProductSerializer
    permission_classes = [IsTenantAdminOrReadOnly]
    filterset_fields = ["category"]
    search_fields = ["name", "code"]

    def perform_create(self, serializer):
        super().perform_create(serializer)
        instance = serializer.instance
        create_audit_log(
            AuditLog.EventType.PRODUCT_CREATED,
            actor=self.request.user,
            organization=instance.organization,
            target_type="Product",
            target_id=instance.id,
            new_value={"name": instance.name, "code": instance.code},
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        create_audit_log(
            AuditLog.EventType.PRODUCT_UPDATED,
            actor=self.request.user,
            organization=instance.organization,
            target_type="Product",
            target_id=instance.id,
            new_value={"name": instance.name, "code": instance.code},
        )

    def perform_destroy(self, instance):
        create_audit_log(
            AuditLog.EventType.PRODUCT_DELETED,
            actor=self.request.user,
            organization=instance.organization,
            target_type="Product",
            target_id=instance.id,
            old_value={"name": instance.name, "code": instance.code},
        )
        instance.delete()
