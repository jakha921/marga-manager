import base64

from django.conf import settings
from rest_framework import generics, viewsets
from rest_framework import serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.mixins import TenantQuerySetMixin
from apps.core.permissions import IsTenantAdmin

from .models import Order, PlanConfig
from .serializers import OrderDetailSerializer, OrderSerializer, PlanConfigSerializer


class PlanConfigListView(generics.ListAPIView):
    """Публичный список активных тарифных планов — не требует аутентификации."""

    permission_classes = [AllowAny]
    serializer_class = PlanConfigSerializer
    queryset = PlanConfig.objects.filter(is_active=True)
    pagination_class = None


class OrderViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD для заказов на подписку. Только TENANT_ADMIN."""

    queryset = Order.objects.select_related("organization", "created_by").all()
    permission_classes = [IsTenantAdmin]
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["status", "target_plan"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        target_plan = request.data.get("target_plan")
        existing = Order.objects.filter(
            organization=request.user.organization,
            status__in=[Order.Status.PENDING, Order.Status.PAYING],
            target_plan=target_plan,
        ).first()
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def checkout_url(self, request, pk=None):
        """Сгенерировать параметры для Payme Checkout (POST для sandbox, GET для прода)."""
        order = self.get_object()
        if not order.is_payable:
            raise drf_serializers.ValidationError("Заказ не может быть оплачен")

        merchant_id = settings.PAYME_MERCHANT_ID
        callback = settings.PAYME_CALLBACK_URL
        checkout_base = settings.PAYME_CHECKOUT_URL

        if "test.paycom.uz" in checkout_base:
            return Response(
                {
                    "method": "POST",
                    "url": checkout_base,
                    "fields": [
                        {"name": "merchant", "value": merchant_id},
                        {"name": "amount", "value": str(order.amount)},
                        {"name": "account[order_id]", "value": str(order.id)},
                        {"name": "lang", "value": "ru"},
                        {"name": "callback", "value": callback},
                    ],
                }
            )

        params = f"m={merchant_id};ac.order_id={order.id};a={order.amount};l=ru;c={callback}"
        encoded = base64.b64encode(params.encode()).decode()
        return Response(
            {
                "method": "GET",
                "url": f"{checkout_base}/{encoded}",
            }
        )
