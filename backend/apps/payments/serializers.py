from rest_framework import serializers

from .models import Order, PaymeTransaction, PlanConfig


class PlanConfigSerializer(serializers.ModelSerializer):
    price_uzs = serializers.SerializerMethodField()

    class Meta:
        model = PlanConfig
        fields = ["plan", "price", "price_uzs", "max_kitchens", "max_users"]

    def get_price_uzs(self, obj) -> int:
        return obj.price // 100


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

        request = self.context.get("request")
        if request and hasattr(request.user, "organization") and request.user.organization:
            org = request.user.organization
            # Нет незавершённых заказов
            if Order.objects.filter(
                organization=org,
                status__in=[Order.Status.PENDING, Order.Status.PAYING],
            ).exists():
                raise serializers.ValidationError(
                    {"non_field_errors": "У организации уже есть незавершённый заказ."}
                )
            # Org не уже на целевом плане
            if org.plan == target_plan:
                raise serializers.ValidationError({"target_plan": "Организация уже на этом плане."})

        try:
            config = PlanConfig.objects.get(plan=target_plan, is_active=True)
            expected = config.price
        except PlanConfig.DoesNotExist:
            raise serializers.ValidationError(
                {"target_plan": f"Тариф {target_plan} не найден или неактивен"}
            )
        if amount != expected:
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
