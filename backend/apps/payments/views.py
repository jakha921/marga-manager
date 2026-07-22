import base64

from django.conf import settings
from django.db import transaction
from rest_framework import generics, viewsets
from rest_framework import serializers as drf_serializers
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.mixins import TenantQuerySetMixin
from apps.core.permissions import IsTenantAdmin

from .models import Order, PlanConfig
from .serializers import (
    OrderDetailSerializer,
    OrderSerializer,
    PlanConfigSerializer,
)

_PLAN_CONFIG_CACHE_KEY = "plan_config_list"


class PlanConfigListView(generics.ListAPIView):
    """Публичный список активных тарифных планов — не требует аутентификации."""

    permission_classes = [AllowAny]
    serializer_class = PlanConfigSerializer
    queryset = PlanConfig.objects.filter(is_active=True)
    pagination_class = None

    def get(self, request, *args, **kwargs):
        from django.core.cache import cache

        cached = cache.get(_PLAN_CONFIG_CACHE_KEY)
        if cached is not None:
            return Response(cached)
        response = super().get(request, *args, **kwargs)
        cache.set(_PLAN_CONFIG_CACHE_KEY, response.data, timeout=3600)
        return response


class OrderViewSet(TenantQuerySetMixin, viewsets.ModelViewSet):
    """CRUD для заказов на подписку. Только TENANT_ADMIN."""

    queryset = Order.objects.select_related("organization", "created_by").all()
    permission_classes = [IsTenantAdmin]
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ["status", "target_plan"]

    def get_permissions(self):
        # Billing must stay reachable for suspended owners so they can pay.
        return [permission() for permission in self.permission_classes]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return OrderDetailSerializer
        return OrderSerializer

    def create(self, request, *args, **kwargs):
        from apps.organizations.models import Organization

        target_plan = request.data.get("target_plan")
        with transaction.atomic():
            # Блокировка строки организации сериализует создание заказов внутри org:
            # два параллельных POST не создадут два PENDING-заказа на один план
            if request.user.organization_id:
                Organization.objects.select_for_update().get(pk=request.user.organization_id)
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


from rest_framework.generics import ListAPIView  # noqa: E402

from .models import Subscription  # noqa: E402
from .serializers import SubscriptionSerializer  # noqa: E402


class SubscriptionListView(TenantQuerySetMixin, ListAPIView):
    """GET /api/payments/subscriptions/ — список подписок организации."""

    queryset = Subscription.objects.select_related("organization", "order").all()
    serializer_class = SubscriptionSerializer
    permission_classes = [IsTenantAdmin]


from django_filters.rest_framework import DjangoFilterBackend  # noqa: E402
from rest_framework.filters import OrderingFilter  # noqa: E402

from apps.core.permissions import IsSuperAdmin  # noqa: E402

from .models import AuditLog  # noqa: E402
from .serializers import AuditLogSerializer  # noqa: E402


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/payments/audit-logs/ — аудит-лог только для SUPER_ADMIN."""

    queryset = AuditLog.objects.select_related("actor", "organization").order_by("-created_at")
    serializer_class = AuditLogSerializer
    permission_classes = [IsSuperAdmin]
    filterset_fields = ["event_type", "organization", "target_type"]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
