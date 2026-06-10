from rest_framework import serializers

from .models import Organization

ORGANIZATION_FIELDS = [
    "id",
    "name",
    "slug",
    "plan",
    "status",
    "max_kitchens",
    "max_users",
    "mrr",
    "contact_name",
    "phone",
    "email",
    "address",
    "currency",
    "tax_rate",
    "low_stock_threshold",
    "plan_started_at",
    "plan_expires_at",
    "kitchen_count",
    "user_count",
    "created_at",
]


class OrganizationSerializer(serializers.ModelSerializer):
    """Сериализатор для TENANT_ADMIN — поля управления планом read-only."""

    kitchen_count = serializers.IntegerField(read_only=True)
    user_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Organization
        fields = ORGANIZATION_FIELDS
        read_only_fields = [
            "created_at",
            "slug",
            "plan",
            "status",
            "max_kitchens",
            "max_users",
            "mrr",
            "plan_started_at",
            "plan_expires_at",
        ]


class AdminOrganizationSerializer(OrganizationSerializer):
    """Сериализатор для SUPER_ADMIN — все поля доступны для записи."""

    class Meta(OrganizationSerializer.Meta):
        read_only_fields = ["created_at"]


class OrganizationDetailSerializer(AdminOrganizationSerializer):
    """Детальный сериализатор для SUPER_ADMIN — включает вложенные данные."""

    kitchens = serializers.SerializerMethodField()
    users_count = serializers.IntegerField(source="user_count", read_only=True)
    kitchens_count = serializers.IntegerField(source="kitchen_count", read_only=True)
    products_count = serializers.SerializerMethodField()
    operations_count = serializers.SerializerMethodField()

    class Meta(AdminOrganizationSerializer.Meta):
        fields = "__all__"

    def get_kitchens(self, obj):
        from apps.kitchens.serializers import KitchenSerializer

        return KitchenSerializer(obj.kitchens.all(), many=True).data

    def get_products_count(self, obj):
        from apps.products.models import Product

        return Product.objects.filter(organization=obj).count()

    def get_operations_count(self, obj):
        from apps.operations.models import OperationEntry

        return OperationEntry.objects.filter(organization=obj).count()
