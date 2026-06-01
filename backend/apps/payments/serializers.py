from rest_framework import serializers

from .models import Order, PaymeTransaction


class PaymeTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymeTransaction
        fields = [
            "id",
            "payme_id",
            "state",
            "amount",
            "reason",
            "payme_create_time",
            "payme_perform_time",
            "payme_cancel_time",
            "created_at",
        ]


class OrderSerializer(serializers.ModelSerializer):
    organization_id = serializers.IntegerField(source="organization.id", read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "organization_id",
            "target_plan",
            "amount",
            "status",
            "created_by",
            "created_by_name",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "paid_at",
            "cancelled_at",
            "created_at",
            "updated_at",
            "created_by",
        ]

    def get_created_by_name(self, obj) -> str | None:
        if not obj.created_by:
            return None
        return obj.created_by.get_full_name() or obj.created_by.username

    def validate(self, attrs):
        target_plan = attrs.get("target_plan")
        amount = attrs.get("amount")
        expected = Order.PLAN_PRICES.get(target_plan)
        if expected is not None and amount != expected:
            raise serializers.ValidationError(
                {"amount": f"Сумма для плана {target_plan} должна быть {expected} тийин"}
            )
        return attrs


class OrderDetailSerializer(OrderSerializer):
    transactions = PaymeTransactionSerializer(
        source="payme_transactions", many=True, read_only=True
    )

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ["transactions"]
