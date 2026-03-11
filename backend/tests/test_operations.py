from datetime import date, time, timedelta
from decimal import Decimal

import pytest

from apps.operations.models import OperationEntry


@pytest.mark.django_db
class TestOperationCRUD:
    def test_tenant_admin_create_operation(self, tenant_admin_client, org, kitchen, product):
        response = tenant_admin_client.post(
            "/api/operations/",
            {
                "type": "INCOMING",
                "date": str(date.today()),
                "time": "09:00:00",
                "kitchen_id": kitchen.id,
                "product_id": product.id,
                "quantity": "100.000",
                "unit": "kg",
                "price": "90000.00",
            },
        )
        assert response.status_code == 201
        assert response.data["organization_id"] == org.id
        assert response.data["kitchen_name"] == "Main Kitchen"
        assert response.data["product_name"] == "Beef"

    def test_kitchen_user_create_operation(self, kitchen_user_client, org, kitchen, product):
        response = kitchen_user_client.post(
            "/api/operations/",
            {
                "type": "SALE",
                "date": str(date.today()),
                "time": "14:00:00",
                "kitchen_id": kitchen.id,
                "product_id": product.id,
                "quantity": "5.000",
                "unit": "kg",
                "price": "120000.00",
            },
        )
        assert response.status_code == 201

    def test_list_operations(self, tenant_admin_client, operation):
        response = tenant_admin_client.get("/api/operations/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_retrieve_operation(self, tenant_admin_client, operation):
        response = tenant_admin_client.get(f"/api/operations/{operation.id}/")
        assert response.status_code == 200
        assert response.data["type"] == "INCOMING"
        assert Decimal(response.data["quantity"]) == Decimal("50.000")

    def test_update_operation(self, tenant_admin_client, operation):
        response = tenant_admin_client.patch(
            f"/api/operations/{operation.id}/",
            {"quantity": "60.000"},
        )
        assert response.status_code == 200
        assert Decimal(response.data["quantity"]) == Decimal("60.000")

    def test_delete_operation(self, tenant_admin_client, operation):
        response = tenant_admin_client.delete(f"/api/operations/{operation.id}/")
        assert response.status_code == 204
        assert not OperationEntry.objects.filter(id=operation.id).exists()


@pytest.mark.django_db
class TestOperationFilters:
    def test_filter_by_type(self, tenant_admin_client, org, kitchen, product):
        OperationEntry.objects.create(
            type="INCOMING",
            date=date.today(),
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=10,
            unit="kg",
            price=80000,
            organization=org,
        )
        OperationEntry.objects.create(
            type="SALE",
            date=date.today(),
            time=time(12, 0),
            kitchen=kitchen,
            product=product,
            quantity=5,
            unit="kg",
            price=120000,
            organization=org,
        )

        response = tenant_admin_client.get("/api/operations/?type=INCOMING")
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["type"] == "INCOMING"

    def test_filter_by_kitchen(self, tenant_admin_client, org, kitchen, kitchen2, product):
        OperationEntry.objects.create(
            type="INCOMING",
            date=date.today(),
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=10,
            unit="kg",
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date=date.today(),
            time=time(11, 0),
            kitchen=kitchen2,
            product=product,
            quantity=20,
            unit="kg",
            organization=org,
        )

        response = tenant_admin_client.get(f"/api/operations/?kitchen={kitchen.id}")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_filter_by_date_range(self, tenant_admin_client, org, kitchen, product):
        yesterday = date.today() - timedelta(days=1)
        tomorrow = date.today() + timedelta(days=1)

        OperationEntry.objects.create(
            type="INCOMING",
            date=yesterday,
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=10,
            unit="kg",
            organization=org,
        )
        OperationEntry.objects.create(
            type="INCOMING",
            date=date.today(),
            time=time(12, 0),
            kitchen=kitchen,
            product=product,
            quantity=20,
            unit="kg",
            organization=org,
        )

        # Only today
        response = tenant_admin_client.get(
            f"/api/operations/?date_from={date.today()}&date_to={date.today()}"
        )
        assert response.status_code == 200
        assert response.data["count"] == 1

        # Yesterday + today
        response = tenant_admin_client.get(
            f"/api/operations/?date_from={yesterday}&date_to={tomorrow}"
        )
        assert response.data["count"] == 2


@pytest.mark.django_db
class TestLastIncomingPrice:
    def test_returns_last_price(self, tenant_admin_client, org, kitchen, product):
        OperationEntry.objects.create(
            type="INCOMING",
            date=date.today() - timedelta(days=1),
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
            date=date.today(),
            time=time(10, 0),
            kitchen=kitchen,
            product=product,
            quantity=30,
            unit="kg",
            price=95000,
            organization=org,
        )

        response = tenant_admin_client.get(f"/api/operations/last-incoming/{product.id}/")
        assert response.status_code == 200
        assert response.data["price"] == "95000.00"
        assert response.data["unit"] == "kg"

    def test_returns_null_when_no_incoming(self, tenant_admin_client, org, kitchen, product):
        response = tenant_admin_client.get(f"/api/operations/last-incoming/{product.id}/")
        assert response.status_code == 200
        assert response.data["price"] is None
        assert response.data["unit"] is None


@pytest.mark.django_db
class TestOperationTenantIsolation:
    def test_cannot_see_other_org_operations(
        self, tenant_admin_client, operation, org2, kitchen_other_org, product_other_org
    ):
        OperationEntry.objects.create(
            type="INCOMING",
            date=date.today(),
            time=time(10, 0),
            kitchen=kitchen_other_org,
            product=product_other_org,
            quantity=100,
            unit="l",
            price=5000,
            organization=org2,
        )

        response = tenant_admin_client.get("/api/operations/")
        assert response.status_code == 200
        # Should only see own org operations
        for op in response.data["results"]:
            assert op["organization_id"] != org2.id
