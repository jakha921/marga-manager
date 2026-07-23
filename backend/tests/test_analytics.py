from datetime import time, timedelta
from decimal import Decimal

import pytest
from django.utils import timezone  # noqa: E402
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.operations.models import OperationEntry


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

    def test_sales_chart_dense_series(self, tenant_admin_client, org, kitchen, product):
        OperationEntry.objects.create(
            type="SALE",
            date="2026-06-29",
            time=time(12, 0),
            kitchen=kitchen,
            product=product,
            quantity=1,
            unit="kg",
            price=5000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date="2026-06-29",
            time=time(9, 0),
            kitchen=kitchen,
            product=product,
            quantity=2,
            unit="kg",
            price=8000,
            organization=org,
        )
        resp = tenant_admin_client.get(
            "/api/analytics/sales-chart/?date_from=2026-06-28&date_to=2026-06-30"
        )
        assert resp.status_code == 200
        series = {r["date"]: r for r in resp.data["series"]}
        assert len(series) == 3  # плотный ряд по всем дням
        assert Decimal(str(series["2026-06-29"]["sales"])) == Decimal("5000")
        assert Decimal(str(series["2026-06-29"]["purchases"])) == Decimal("8000")
        assert Decimal(str(series["2026-06-28"]["sales"])) == Decimal("0")

    def test_product_consumption_interval(self, tenant_admin_client, org, kitchen, product):
        # Остаток 100 (25-го), приход 20 (28-го), остаток 80 (30-го) → расход 40
        OperationEntry.objects.create(
            type="DAILY",
            date="2026-06-25",
            time=time(8, 0),
            kitchen=kitchen,
            product=product,
            quantity=100,
            unit="kg",
            price=0,
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date="2026-06-28",
            time=time(9, 0),
            kitchen=kitchen,
            product=product,
            quantity=20,
            unit="kg",
            price=0,
            organization=org,
        )
        OperationEntry.objects.create(
            type="DAILY",
            date="2026-06-30",
            time=time(20, 0),
            kitchen=kitchen,
            product=product,
            quantity=80,
            unit="kg",
            price=0,
            organization=org,
        )
        resp = tenant_admin_client.get(
            f"/api/analytics/product-consumption/{product.id}/"
            "?date_from=2026-06-25&date_to=2026-06-30"
        )
        assert resp.status_code == 200
        series = {r["date"]: Decimal(str(r["value"])) for r in resp.data["series"]}
        assert series["2026-06-25"] == Decimal("0")  # первая запись — базы нет
        assert series["2026-06-30"] == Decimal("40")  # 100 + 20 - 80

    def test_product_consumption_tenant_isolation(self, tenant_admin_client, product_other_org):
        resp = tenant_admin_client.get(
            f"/api/analytics/product-consumption/{product_other_org.id}/"
            "?date_from=2026-06-01&date_to=2026-06-30"
        )
        assert resp.status_code == 404

    def test_basic_plan_history_clamped_to_30_days(
        self, tenant_admin_client, org, kitchen, product
    ):
        """BASIC не видит операции старше 30 дней; PRO видит."""
        from django.utils import timezone as tz

        old_date = tz.localdate() - tz.timedelta(days=45)
        OperationEntry.objects.create(
            type="SALE",
            date=old_date,
            time=time(12, 0),
            kitchen=kitchen,
            product=product,
            quantity=1,
            unit="kg",
            price=99999,
            organization=org,
        )

        org.plan = "BASIC"
        org.save(update_fields=["plan"])
        resp = tenant_admin_client.get(f"/api/operations/?date_from={old_date}&page_size=50")
        assert resp.status_code == 200
        assert all(o["price"] != "99999.00" for o in resp.data["results"])

        report = tenant_admin_client.get(
            f"/api/analytics/kitchen-report/?date_from={old_date}&date_to={tz.localdate()}"
        )
        k_data = next(k for k in report.data["kitchens"] if k["kitchen_id"] == kitchen.id)
        assert Decimal(str(k_data["sales_revenue"])) == Decimal("0")

        org.plan = "PRO"
        org.save(update_fields=["plan"])
        resp = tenant_admin_client.get(f"/api/operations/?date_from={old_date}&page_size=50")
        assert any(
            o["price"] == 99999 or str(o["price"]) == "99999.00" for o in resp.data["results"]
        )

    def test_balance_falls_back_to_latest_daily(self, tenant_admin_client, org, kitchen, product):
        """Если на границах диапазона нет DAILY-записи, берётся последняя известная."""
        from datetime import date as date_cls

        OperationEntry.objects.create(
            type="DAILY",
            date=date_cls(2026, 6, 25),
            time=time(8, 0),
            kitchen=kitchen,
            product=product,
            quantity=100,
            unit="kg",
            price=500000,
            organization=org,
        )

        # Диапазон 06-28..06-30: DAILY-записей внутри и на границах нет
        response = tenant_admin_client.get(
            "/api/analytics/kitchen-report/?date_from=2026-06-28&date_to=2026-06-30"
        )
        assert response.status_code == 200
        k_data = next(k for k in response.data["kitchens"] if k["kitchen_id"] == kitchen.id)
        assert Decimal(str(k_data["beginning_balance"])) == Decimal("500000")
        assert Decimal(str(k_data["end_balance"])) == Decimal("500000")
        # Остатки равны, движения нет — расход нулевой, а не отрицательный
        assert Decimal(str(k_data["actual_expense"])) == Decimal("0")

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


@pytest.mark.django_db
class TestKitchenReportXlsx:
    """9.3 — GET /api/analytics/kitchen-report/?format=xlsx returns xlsx."""

    XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    def test_kitchen_report_json(self, tenant_admin_client):
        today = timezone.now().date()
        resp = tenant_admin_client.get(
            f"/api/analytics/kitchen-report/?date_from={today}&date_to={today}"
        )
        assert resp.status_code == 200
        assert "kitchens" in resp.data

    def test_kitchen_report_xlsx(self, tenant_admin_client):
        today = timezone.now().date()
        resp = tenant_admin_client.get(
            f"/api/analytics/kitchen-report/?date_from={today}&date_to={today}&output=xlsx"
        )
        assert resp.status_code == 200
        assert self.XLSX_MIME in resp["Content-Type"]

    def test_kitchen_report_unauthenticated(self, api_client):
        resp = api_client.get("/api/analytics/kitchen-report/")
        assert resp.status_code == 401


@pytest.mark.django_db
class TestNullOrgUserBlocked:
    """Пользователи без организации должны получать 403 на аналитических эндпоинтах."""

    @pytest.fixture
    def null_org_client(self, db):
        user = User.objects.create_user(
            username="noorg_admin",
            password="pass123",
            role="TENANT_ADMIN",
            organization=None,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    @pytest.fixture
    def null_org_kitchen_client(self, db):
        user = User.objects.create_user(
            username="noorg_kitchen",
            password="pass123",
            role="KITCHEN_USER",
            organization=None,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    def test_kitchen_report_null_org_blocked(self, null_org_client):
        today = timezone.now().date().isoformat()
        resp = null_org_client.get(
            f"/api/analytics/kitchen-report/?date_from={today}&date_to={today}"
        )
        assert resp.status_code == 403

    def test_operations_summary_null_org_blocked(self, null_org_client):
        today = timezone.now().date().isoformat()
        resp = null_org_client.get(
            f"/api/analytics/operations-summary/?date_from={today}&date_to={today}"
        )
        assert resp.status_code == 403

    def test_operations_list_null_org_returns_empty(self, null_org_client):
        resp = null_org_client.get("/api/operations/")
        assert resp.status_code == 200
        data = resp.json()
        results = data.get("results", data) if isinstance(data, dict) else data
        assert len(results) == 0


@pytest.mark.django_db
class TestAnalyticsIsolation:
    """Tenant isolation — каждый tenant видит только свои данные."""

    def test_sales_chart_shows_only_own_data(
        self, tenant_admin_client, tenant_admin2_client, org, kitchen, product
    ):
        today = timezone.now().date()
        OperationEntry.objects.create(
            organization=org,
            kitchen=kitchen,
            product=product,
            type="SALE",
            quantity=5,
            price=100,
            date=today,
            time=time(12, 0),
            unit=product.unit,
        )
        d = today.isoformat()
        resp1 = tenant_admin_client.get(f"/api/analytics/sales-chart/?date_from={d}&date_to={d}")
        resp2 = tenant_admin2_client.get(f"/api/analytics/sales-chart/?date_from={d}&date_to={d}")
        assert Decimal(str(resp1.json()["series"][0]["sales"])) == Decimal("100")
        assert Decimal(str(resp2.json()["series"][0]["sales"])) == Decimal("0")
