from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    """Сериализатор категории."""

    organization_id = serializers.IntegerField(source="organization.id", read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "organization_id", "created_at"]
        read_only_fields = ["created_at"]


class ProductSerializer(serializers.ModelSerializer):
    """Сериализатор продукта."""

    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    organization_id = serializers.IntegerField(source="organization.id", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "code",
            "name",
            "category",
            "category_name",
            "unit",
            "organization_id",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_code(self, value: str) -> str:
        """Проверка уникальности кода в рамках организации."""
        request = self.context.get("request")
        if request and request.user.organization:
            qs = Product.objects.filter(organization=request.user.organization, code=value)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Продукт с таким кодом уже существует.")
        return value
