import pytest

from apps.products.models import Category, Product


@pytest.mark.django_db
class TestCategoryTenantAdmin:
    def test_list_categories(self, tenant_admin_client, category):
        response = tenant_admin_client.get("/api/categories/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_create_category(self, tenant_admin_client, org):
        response = tenant_admin_client.post(
            "/api/categories/",
            {"name": "Vegetables"},
        )
        assert response.status_code == 201
        assert response.data["name"] == "Vegetables"
        assert response.data["organization_id"] == org.id

    def test_update_category(self, tenant_admin_client, category):
        response = tenant_admin_client.patch(
            f"/api/categories/{category.id}/",
            {"name": "Updated Category"},
        )
        assert response.status_code == 200
        assert response.data["name"] == "Updated Category"

    def test_delete_category(self, tenant_admin_client, category):
        response = tenant_admin_client.delete(f"/api/categories/{category.id}/")
        assert response.status_code == 204
        assert not Category.objects.filter(id=category.id).exists()


@pytest.mark.django_db
class TestProductTenantAdmin:
    def test_list_products(self, tenant_admin_client, product):
        response = tenant_admin_client.get("/api/products/")
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_create_product(self, tenant_admin_client, org, category):
        response = tenant_admin_client.post(
            "/api/products/",
            {
                "code": "VEG001",
                "name": "Tomato",
                "category": category.id,
                "unit": "kg",
            },
        )
        assert response.status_code == 201
        assert response.data["name"] == "Tomato"
        assert response.data["organization_id"] == org.id
        assert response.data["category_name"] == "Raw Materials"

    def test_retrieve_product(self, tenant_admin_client, product):
        response = tenant_admin_client.get(f"/api/products/{product.id}/")
        assert response.status_code == 200
        assert response.data["code"] == "MEAT001"
        assert response.data["category_name"] == "Raw Materials"

    def test_update_product(self, tenant_admin_client, product):
        response = tenant_admin_client.patch(
            f"/api/products/{product.id}/",
            {"name": "Lamb"},
        )
        assert response.status_code == 200
        assert response.data["name"] == "Lamb"

    def test_delete_product(self, tenant_admin_client, product):
        response = tenant_admin_client.delete(f"/api/products/{product.id}/")
        assert response.status_code == 204
        assert not Product.objects.filter(id=product.id).exists()


@pytest.mark.django_db
class TestProductUniqueCode:
    def test_duplicate_code_same_org(self, tenant_admin_client, product, category):
        response = tenant_admin_client.post(
            "/api/products/",
            {
                "code": "MEAT001",  # same code as existing product
                "name": "Another Meat",
                "category": category.id,
                "unit": "kg",
            },
        )
        assert response.status_code == 400

    def test_same_code_different_org(self, db, org, org2, category, category_other_org):
        """Same product code allowed in different organizations."""
        Product.objects.create(
            code="SHARED01", name="P1", unit="kg", category=category, organization=org
        )
        p2 = Product.objects.create(
            code="SHARED01",
            name="P2",
            unit="kg",
            category=category_other_org,
            organization=org2,
        )
        assert p2.pk is not None


@pytest.mark.django_db
class TestProductKitchenUser:
    def test_list_products(self, kitchen_user_client, product):
        response = kitchen_user_client.get("/api/products/")
        assert response.status_code == 200

    def test_create_forbidden(self, kitchen_user_client, category):
        response = kitchen_user_client.post(
            "/api/products/",
            {"code": "X", "name": "X", "category": category.id, "unit": "kg"},
        )
        assert response.status_code == 403

    def test_update_forbidden(self, kitchen_user_client, product):
        response = kitchen_user_client.patch(
            f"/api/products/{product.id}/",
            {"name": "Hack"},
        )
        assert response.status_code == 403

    def test_delete_forbidden(self, kitchen_user_client, product):
        response = kitchen_user_client.delete(f"/api/products/{product.id}/")
        assert response.status_code == 403


@pytest.mark.django_db
class TestProductTenantIsolation:
    def test_cannot_see_other_org_products(self, tenant_admin_client, product, product_other_org):
        response = tenant_admin_client.get("/api/products/")
        product_ids = [p["id"] for p in response.data["results"]]
        assert product.id in product_ids
        assert product_other_org.id not in product_ids

    def test_cannot_retrieve_other_org_product(self, tenant_admin_client, product_other_org):
        response = tenant_admin_client.get(f"/api/products/{product_other_org.id}/")
        assert response.status_code == 404
