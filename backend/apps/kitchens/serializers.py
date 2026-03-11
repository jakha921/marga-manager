from rest_framework import serializers

from .models import Kitchen


class KitchenSerializer(serializers.ModelSerializer):
    """Сериализатор кухни."""

    organization_id = serializers.IntegerField(source="organization.id", read_only=True)

    class Meta:
        model = Kitchen
        fields = ["id", "name", "is_active", "organization_id", "created_at"]
        read_only_fields = ["created_at"]
