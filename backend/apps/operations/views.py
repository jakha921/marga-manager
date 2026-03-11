from django.db.models import Count, Sum
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsKitchenUserOrAbove

from .filters import OperationEntryFilter
from .models import OperationEntry
from .serializers import OperationEntrySerializer


class OperationViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD операций."""

    queryset = OperationEntry.objects.select_related("kitchen", "to_kitchen", "product").all()
    serializer_class = OperationEntrySerializer
    permission_classes = [IsKitchenUserOrAbove]
    filterset_class = OperationEntryFilter
    search_fields = ["product__name"]

    @action(detail=False, url_path="last-incoming/(?P<product_id>[^/.]+)")
    def last_incoming(self, request, product_id=None):
        """Последняя цена прихода для автозаполнения."""
        qs = (
            self.get_queryset()
            .filter(
                type=OperationEntry.Type.INCOMING,
                product_id=product_id,
                price__isnull=False,
            )
            .order_by("-date", "-time")
            .first()
        )

        if qs:
            return Response({"price": str(qs.price), "unit": qs.unit})
        return Response({"price": None, "unit": None})


class DashboardView(APIView):
    """GET /api/analytics/dashboard/ — агрегированные данные."""

    permission_classes = [IsKitchenUserOrAbove]

    def get(self, request):
        from django.utils import timezone

        today = timezone.now().date()
        user = request.user

        qs = OperationEntry.objects.all()
        if user.role != "SUPER_ADMIN" and user.organization:
            qs = qs.filter(organization=user.organization)

        today_qs = qs.filter(date=today)

        stats = {
            "today_entries": today_qs.count(),
            "incoming_total": (
                today_qs.filter(type="INCOMING").aggregate(total=Sum("quantity"))["total"] or 0
            ),
            "sales_count": today_qs.filter(type="SALE").count(),
            "sales_total": (
                today_qs.filter(type="SALE").aggregate(total=Sum("price"))["total"] or 0
            ),
            "operations_by_type": list(
                qs.values("type").annotate(count=Count("id")).order_by("type")
            ),
        }
        return Response(stats)


class ProductHistoryView(APIView):
    """GET /api/analytics/product-history/<product_id>/ — история по дням."""

    permission_classes = [IsKitchenUserOrAbove]

    def get(self, request, product_id):
        user = request.user

        qs = OperationEntry.objects.filter(product_id=product_id)
        if user.role != "SUPER_ADMIN" and user.organization:
            qs = qs.filter(organization=user.organization)

        history = (
            qs.values("date", "type")
            .annotate(total_quantity=Sum("quantity"), count=Count("id"))
            .order_by("date")
        )
        return Response(list(history))
