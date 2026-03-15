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

    unit = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    price = serializers.DecimalField(
        max_digits=30, decimal_places=15, required=False, allow_null=True, coerce_to_string=False
    )

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

    def validate_price(self, value):
        """Округление цены до 2 знаков после запятой."""
        if value is not None:
            from decimal import ROUND_HALF_UP, Decimal

            return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return value

    def validate_quantity(self, value):
        """Количество должно быть больше 0."""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Количество должно быть больше 0.")
        return value

    def validate(self, attrs):
        """Кросс-полевая валидация операции."""
        # Для PATCH берём недостающие поля из instance
        op_type = attrs.get("type", getattr(self.instance, "type", None))
        kitchen = attrs.get("kitchen", getattr(self.instance, "kitchen", None))
        to_kitchen = attrs.get("to_kitchen", getattr(self.instance, "to_kitchen", None))
        price = attrs.get("price", getattr(self.instance, "price", None))
        product = attrs.get("product", getattr(self.instance, "product", None))

        # TRANSFER: to_kitchen обязателен, kitchen != to_kitchen
        if op_type == OperationEntry.Type.TRANSFER:
            if not to_kitchen:
                raise serializers.ValidationError(
                    {"to_kitchen_id": "Для перемещения необходимо указать кухню-получатель."}
                )
            if kitchen and to_kitchen and kitchen == to_kitchen:
                raise serializers.ValidationError(
                    {"to_kitchen_id": "Кухня-отправитель и кухня-получатель не могут совпадать."}
                )

        # SALE/INCOMING: price обязателен
        if op_type in (OperationEntry.Type.SALE, OperationEntry.Type.INCOMING):
            if price is None:
                raise serializers.ValidationError(
                    {"price": "Цена обязательна для данного типа операции."}
                )

        # Авто-заполнение unit из product
        if product:
            if "unit" not in attrs or not attrs.get("unit"):
                attrs["unit"] = product.unit
            elif attrs.get("unit") != product.unit:
                raise serializers.ValidationError(
                    {"unit": f"Единица измерения не совпадает с продуктом ({product.unit})."}
                )

        return attrs
