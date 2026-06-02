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

    def perform_create(self, serializer):
        serializer.save(
            organization=self.request.user.organization,
            created_by=self.request.user,
        )

    @action(detail=True, methods=["post"])
    def checkout_url(self, request, pk=None):
        """Сгенерировать URL для редиректа на Payme Checkout."""
        order = self.get_object()
        if not order.is_payable:
            raise drf_serializers.ValidationError("Заказ не может быть оплачен")

        merchant_id = settings.PAYME_MERCHANT_ID
        callback = settings.PAYME_CALLBACK_URL
        params = f"m={merchant_id};ac.order_id={order.id};a={order.amount};l=ru;c={callback}"
        encoded = base64.b64encode(params.encode()).decode()
        checkout_url = f"{settings.PAYME_CHECKOUT_URL}/{encoded}"

        return Response({"checkout_url": checkout_url})
