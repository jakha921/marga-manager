from datetime import time, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone  # noqa: E402

from apps.operations.models import OperationEntry


@pytest.mark.django_db
class TestDashboard:
    def test_dashboard_returns_aggregated_data(self, tenant_admin_client, org, kitchen, product):
        today = timezone.now().date()
        # Create today's operations
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(9, 0),
            kitchen=kitchen,
            product=product,
            quantity=100,
            unit="kg",
            price=85000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="SALE",
            date=today,
            time=time(14, 0),
            kitchen=kitchen,
            product=product,
            quantity=10,
            unit="kg",
            price=120000,
            organization=org,
        )
        # Yesterday operation (should not appear in today stats)
        OperationEntry.objects.create(
            type="INCOMING",
            date=today - timedelta(days=1),
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=200,
            unit="kg",
            price=80000,
            organization=org,
        )

        response = tenant_admin_client.get("/api/analytics/dashboard/")
        assert response.status_code == 200

        data = response.data
        assert data["today_entries"] == 2
        assert Decimal(str(data["incoming_total"])) == Decimal("100.000")
        assert data["sales_count"] == 1
        assert Decimal(str(data["sales_total"])) == Decimal("120000.00")
        assert "operations_by_type" in data

    def test_dashboard_tenant_isolation(
        self, tenant_admin_client, org, org2, kitchen, kitchen_other_org, product, product_other_org
    ):
        today = timezone.now().date()
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=50,
            unit="kg",
            price=85000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(10, 0),
            kitchen=kitchen_other_org,
            product=product_other_org,
            quantity=100,
            unit="l",
            price=5000,
            organization=org2,
        )

        response = tenant_admin_client.get("/api/analytics/dashboard/")
        assert response.status_code == 200
        # Should only see own org's entries
        assert response.data["today_entries"] == 1

    def test_dashboard_unauthenticated(self, api_client):
        response = api_client.get("/api/analytics/dashboard/")
        assert response.status_code == 401


@pytest.mark.django_db
class TestProductHistory:
    def test_product_history_grouped_by_date(self, tenant_admin_client, org, kitchen, product):
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)

        OperationEntry.objects.create(
            type="INCOMING",
            date=yesterday,
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=50,
            unit="kg",
            price=80000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date=yesterday,
            time=time(14, 0),
            kitchen=kitchen,
            product=product,
            quantity=30,
            unit="kg",
            price=85000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="SALE",
            date=today,
            time=time(12, 0),
            kitchen=kitchen,
            product=product,
            quantity=10,
            unit="kg",
            price=120000,
            organization=org,
        )

        response = tenant_admin_client.get(f"/api/analytics/product-history/{product.id}/")
        assert response.status_code == 200
        data = response.data
        assert len(data) >= 2  # At least 2 groups (yesterday INCOMING + today SALE)

        # Find yesterday's incoming group
        yesterday_incoming = [
            d for d in data if str(d["date"]) == str(yesterday) and d["type"] == "INCOMING"
        ]
        assert len(yesterday_incoming) == 1
        assert Decimal(str(yesterday_incoming[0]["total_quantity"])) == Decimal("80.000")
        assert yesterday_incoming[0]["count"] == 2

    def test_product_history_tenant_isolation(
        self,
        tenant_admin_client,
        org,
        org2,
        kitchen,
        kitchen_other_org,
        product,
        product_other_org,
    ):
        today = timezone.now().date()
        # Create operations for product in other org
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(10, 0),
            kitchen=kitchen_other_org,
            product=product_other_org,
            quantity=999,
            unit="l",
            price=5000,
            organization=org2,
        )

        response = tenant_admin_client.get(
            f"/api/analytics/product-history/{product_other_org.id}/"
        )
        assert response.status_code == 200
        # Tenant admin should not see other org's product history
        assert len(response.data) == 0

    def test_product_history_unauthenticated(self, api_client, product):
        response = api_client.get(f"/api/analytics/product-history/{product.id}/")
        assert response.status_code == 401
