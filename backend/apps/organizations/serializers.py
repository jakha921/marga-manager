from rest_framework import serializers

from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    """Сериализатор организации."""

    kitchen_count = serializers.IntegerField(source="kitchens.count", read_only=True)
    user_count = serializers.IntegerField(source="users.count", read_only=True)

    class Meta:
        model = Organization
        fields = [
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
            "kitchen_count",
            "user_count",
            "created_at",
        ]
        read_only_fields = ["created_at"]
