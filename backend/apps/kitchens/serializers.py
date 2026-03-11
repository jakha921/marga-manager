from rest_framework import serializers

from .models import Kitchen


class KitchenSerializer(serializers.ModelSerializer):
    """Сериализатор кухни."""

    class Meta:
        model = Kitchen
        fields = ["id", "name", "is_active", "organization", "created_at"]
        read_only_fields = ["created_at", "organization"]
