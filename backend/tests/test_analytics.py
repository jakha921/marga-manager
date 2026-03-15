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


@pytest.mark.django_db
class TestKitchenReport:
    def test_basic_report(self, tenant_admin_client, org, kitchen, kitchen2, product):
        today = timezone.now().date()
        yesterday = today - timedelta(days=1)

        # Начальный остаток (DAILY на yesterday)
        OperationEntry.objects.create(
            type="DAILY",
            date=yesterday,
            time=time(8, 0),
            kitchen=kitchen,
            product=product,
            quantity=100,
            unit="kg",
            price=500000,
            organization=org,
        )
        # Приход за период
        OperationEntry.objects.create(
            type="INCOMING",
            date=yesterday,
            time=time(9, 0),
            kitchen=kitchen,
            product=product,
            quantity=50,
            unit="kg",
            price=250000,
            organization=org,
        )
        # Конечный остаток (DAILY на today)
        OperationEntry.objects.create(
            type="DAILY",
            date=today,
            time=time(8, 0),
            kitchen=kitchen,
            product=product,
            quantity=80,
            unit="kg",
            price=400000,
            organization=org,
        )
        # Продажи
        OperationEntry.objects.create(
            type="SALE",
            date=today,
            time=time(12, 0),
            kitchen=kitchen,
            product=product,
            quantity=20,
            unit="kg",
            price=600000,
            organization=org,
        )

        response = tenant_admin_client.get(
            f"/api/analytics/kitchen-report/?date_from={yesterday}&date_to={today}"
        )
        assert response.status_code == 200
        assert "kitchens" in response.data
        assert "totals" in response.data

        # Находим kitchen в ответе
        k_data = next(k for k in response.data["kitchens"] if k["kitchen_id"] == kitchen.id)
        assert Decimal(str(k_data["beginning_balance"])) == Decimal("500000")
        assert Decimal(str(k_data["incoming"])) == Decimal("250000")
        assert Decimal(str(k_data["end_balance"])) == Decimal("400000")
        assert Decimal(str(k_data["sales_revenue"])) == Decimal("600000")
        # actual_expense = 500000 + 250000 + 0 - 0 - 400000 = 350000
        assert Decimal(str(k_data["actual_expense"])) == Decimal("350000")

    def test_requires_date_params(self, tenant_admin_client):
        response = tenant_admin_client.get("/api/analytics/kitchen-report/")
        assert response.status_code == 400

    def test_kitchen_filter(self, tenant_admin_client, org, kitchen, kitchen2, product):
        today = timezone.now().date()
        OperationEntry.objects.create(
            type="DAILY",
            date=today,
            time=time(8, 0),
            kitchen=kitchen,
            product=product,
            quantity=10,
            unit="kg",
            price=50000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="DAILY",
            date=today,
            time=time(8, 0),
            kitchen=kitchen2,
            product=product,
            quantity=20,
            unit="kg",
            price=100000,
            organization=org,
        )

        response = tenant_admin_client.get(
            f"/api/analytics/kitchen-report/?date_from={today}&date_to={today}&kitchen={kitchen.id}"
        )
        assert response.status_code == 200
        assert len(response.data["kitchens"]) == 1
        assert response.data["kitchens"][0]["kitchen_id"] == kitchen.id

    def test_tenant_isolation(
        self, tenant_admin_client, org, org2, kitchen, kitchen_other_org, product, product_other_org
    ):
        today = timezone.now().date()
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(10, 0),
            kitchen=kitchen_other_org,
            product=product_other_org,
            quantity=100,
            unit="l",
            price=999999,
            organization=org2,
        )

        response = tenant_admin_client.get(
            f"/api/analytics/kitchen-report/?date_from={today}&date_to={today}"
        )
        assert response.status_code == 200
        # Не должно быть кухни другой организации
        kitchen_ids = [k["kitchen_id"] for k in response.data["kitchens"]]
        assert kitchen_other_org.id not in kitchen_ids


@pytest.mark.django_db
class TestOperationsSummary:
    def test_basic_summary(self, tenant_admin_client, org, kitchen, product):
        today = timezone.now().date()
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(9, 0),
            kitchen=kitchen,
            product=product,
            quantity=50,
            unit="kg",
            price=250000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=30,
            unit="kg",
            price=150000,
            organization=org,
        )

        response = tenant_admin_client.get(
            f"/api/analytics/operations-summary/?type=INCOMING&date_from={today}&date_to={today}"
        )
        assert response.status_code == 200
        assert Decimal(str(response.data["total_amount"])) == Decimal("400000")
        assert response.data["count"] == 2
        assert "kg" in response.data["total_quantities"]

    def test_groups_by_unit(self, tenant_admin_client, org, kitchen, product, category):
        from apps.products.models import Product

        today = timezone.now().date()
        product_l = Product.objects.create(
            code="MILK001", name="Milk", category=category, unit="L", organization=org
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(9, 0),
            kitchen=kitchen,
            product=product,
            quantity=10,
            unit="kg",
            price=50000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(10, 0),
            kitchen=kitchen,
            product=product_l,
            quantity=20,
            unit="L",
            price=30000,
            organization=org,
        )

        response = tenant_admin_client.get(
            f"/api/analytics/operations-summary/?type=INCOMING&date_from={today}&date_to={today}"
        )
        assert response.status_code == 200
        assert "kg" in response.data["total_quantities"]
        assert "L" in response.data["total_quantities"]

    def test_filters_work(self, tenant_admin_client, org, kitchen, kitchen2, product):
        today = timezone.now().date()
        OperationEntry.objects.create(
            type="INCOMING",
            date=today,
            time=time(9, 0),
            kitchen=kitchen,
            product=product,
            quantity=50,
            unit="kg",
            price=250000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="SALE",
            date=today,
            time=time(10, 0),
            kitchen=kitchen2,
            product=product,
            quantity=10,
            unit="kg",
            price=100000,
            organization=org,
        )

        # Только INCOMING
        response = tenant_admin_client.get(
            f"/api/analytics/operations-summary/?type=INCOMING&date_from={today}&date_to={today}"
        )
        assert response.data["count"] == 1

        # Только kitchen
        response = tenant_admin_client.get(
            f"/api/analytics/operations-summary/?kitchen={kitchen.id}&date_from={today}&date_to={today}"
        )
        assert response.data["count"] == 1
