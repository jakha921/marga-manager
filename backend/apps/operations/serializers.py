from rest_framework import serializers

from .models import OperationEntry


class OperationEntrySerializer(serializers.ModelSerializer):
    """Сериализатор операции."""

    kitchen_name = serializers.CharField(source="kitchen.name", read_only=True)
    to_kitchen_name = serializers.CharField(source="to_kitchen.name", read_only=True, default=None)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OperationEntry
        fields = [
            "id",
            "type",
            "date",
            "time",
            "kitchen",
            "kitchen_name",
            "to_kitchen",
            "to_kitchen_name",
            "product",
            "product_name",
            "quantity",
            "unit",
            "price",
            "organization",
            "created_at",
        ]
        read_only_fields = ["created_at", "organization"]
