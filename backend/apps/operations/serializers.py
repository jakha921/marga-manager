from rest_framework import serializers

from apps.kitchens.models import Kitchen
from apps.products.models import Product

from .models import OperationEntry


class OperationEntrySerializer(serializers.ModelSerializer):
    """Сериализатор операции."""

    kitchen_id = serializers.PrimaryKeyRelatedField(
        source="kitchen",
        queryset=Kitchen.objects.all(),
    )
    kitchen_name = serializers.CharField(source="kitchen.name", read_only=True)

    to_kitchen_id = serializers.PrimaryKeyRelatedField(
        source="to_kitchen",
        queryset=Kitchen.objects.all(),
        required=False,
        allow_null=True,
    )
    to_kitchen_name = serializers.CharField(source="to_kitchen.name", read_only=True, default=None)

    product_id = serializers.PrimaryKeyRelatedField(
        source="product",
        queryset=Product.objects.all(),
        required=False,
        allow_null=True,
    )
    product_name = serializers.CharField(source="product.name", read_only=True, default=None)

    organization_id = serializers.IntegerField(source="organization.id", read_only=True)

    class Meta:
        model = OperationEntry
        fields = [
            "id",
            "type",
            "date",
            "time",
            "kitchen_id",
            "kitchen_name",
            "to_kitchen_id",
            "to_kitchen_name",
            "product_id",
            "product_name",
            "quantity",
            "unit",
            "price",
            "organization_id",
            "created_at",
        ]
        read_only_fields = ["created_at"]
