"""Full permission matrix tests across all roles and endpoints."""

from datetime import date

import pytest


@pytest.mark.django_db
class TestSuperAdminFullAccess:
    """SUPER_ADMIN has full access to all endpoints."""

    def test_organizations_crud(self, super_admin_client, org):
        assert super_admin_client.get("/api/organizations/").status_code == 200
        resp = super_admin_client.post(
            "/api/organizations/",
            {"name": "SA Org", "slug": "sa-org", "plan": "BASIC", "status": "ACTIVE"},
        )
        assert resp.status_code == 201
        assert super_admin_client.get(f"/api/organizations/{org.id}/").status_code == 200
        assert (
            super_admin_client.patch(f"/api/organizations/{org.id}/", {"name": "X"}).status_code
            == 200
        )

    def test_users_crud(self, super_admin_client, tenant_admin):
        assert super_admin_client.get("/api/users/").status_code == 200
        assert super_admin_client.get(f"/api/users/{tenant_admin.id}/").status_code == 200

    def test_kitchens_access(self, super_admin_client, kitchen):
        assert super_admin_client.get("/api/kitchens/").status_code == 200
        assert super_admin_client.get(f"/api/kitchens/{kitchen.id}/").status_code == 200
        assert (
            super_admin_client.patch(
                f"/api/kitchens/{kitchen.id}/", {"name": "SA Updated"}
            ).status_code
            == 200
        )

    def test_products_crud(self, super_admin_client, product, category, org):
        assert super_admin_client.get("/api/products/").status_code == 200
        assert super_admin_client.get(f"/api/products/{product.id}/").status_code == 200

    def test_categories_access(self, super_admin_client, category):
        assert super_admin_client.get("/api/categories/").status_code == 200
        assert super_admin_client.get(f"/api/categories/{category.id}/").status_code == 200
        assert (
            super_admin_client.patch(
                f"/api/categories/{category.id}/", {"name": "SA Updated"}
            ).status_code
            == 200
        )

    def test_operations_crud(self, super_admin_client, operation):
        assert super_admin_client.get("/api/operations/").status_code == 200
        assert super_admin_client.get(f"/api/operations/{operation.id}/").status_code == 200

    def test_analytics(self, super_admin_client, product):
        assert super_admin_client.get("/api/analytics/dashboard/").status_code == 200
        assert (
            super_admin_client.get(f"/api/analytics/product-history/{product.id}/").status_code
            == 200
        )


@pytest.mark.django_db
class TestTenantAdminPermissions:
    """TENANT_ADMIN: own org CRUD, no organization management."""

    def test_organizations_forbidden(self, tenant_admin_client, org):
        assert tenant_admin_client.get("/api/organizations/").status_code == 403
        assert (
            tenant_admin_client.post("/api/organizations/", {"name": "X", "slug": "x"}).status_code
            == 403
        )

    def test_users_crud(self, tenant_admin_client, kitchen_user):
        assert tenant_admin_client.get("/api/users/").status_code == 200
        assert tenant_admin_client.get(f"/api/users/{kitchen_user.id}/").status_code == 200

    def test_kitchens_full_crud(self, tenant_admin_client, kitchen, org):
        assert tenant_admin_client.get("/api/kitchens/").status_code == 200
        resp = tenant_admin_client.post("/api/kitchens/", {"name": "New"})
        assert resp.status_code == 201
        assert (
            tenant_admin_client.patch(f"/api/kitchens/{kitchen.id}/", {"name": "U"}).status_code
            == 200
        )
        assert tenant_admin_client.delete(f"/api/kitchens/{kitchen.id}/").status_code == 204

    def test_products_full_crud(self, tenant_admin_client, product, category, org):
        assert tenant_admin_client.get("/api/products/").status_code == 200
        resp = tenant_admin_client.post(
            "/api/products/",
            {"code": "NEW01", "name": "New", "category": category.id, "unit": "kg"},
        )
        assert resp.status_code == 201
        assert (
            tenant_admin_client.patch(f"/api/products/{product.id}/", {"name": "U"}).status_code
            == 200
        )
        assert tenant_admin_client.delete(f"/api/products/{product.id}/").status_code == 204

    def test_categories_full_crud(self, tenant_admin_client, category, org):
        assert tenant_admin_client.get("/api/categories/").status_code == 200
        resp = tenant_admin_client.post("/api/categories/", {"name": "New Cat"})
        assert resp.status_code == 201
        assert (
            tenant_admin_client.patch(f"/api/categories/{category.id}/", {"name": "U"}).status_code
            == 200
        )
        assert tenant_admin_client.delete(f"/api/categories/{category.id}/").status_code == 204

    def test_operations_full_crud(self, tenant_admin_client, operation, kitchen, product, org):
        assert tenant_admin_client.get("/api/operations/").status_code == 200
        resp = tenant_admin_client.post(
            "/api/operations/",
            {
                "type": "INCOMING",
                "date": str(date.today()),
                "time": "10:00:00",
                "kitchen": kitchen.id,
                "product": product.id,
                "quantity": "10.000",
                "unit": "kg",
            },
        )
        assert resp.status_code == 201
        assert (
            tenant_admin_client.patch(
                f"/api/operations/{operation.id}/", {"quantity": "99.000"}
            ).status_code
            == 200
        )
        assert tenant_admin_client.delete(f"/api/operations/{operation.id}/").status_code == 204

    def test_analytics(self, tenant_admin_client, product):
        assert tenant_admin_client.get("/api/analytics/dashboard/").status_code == 200
        assert (
            tenant_admin_client.get(f"/api/analytics/product-history/{product.id}/").status_code
            == 200
        )


@pytest.mark.django_db
class TestKitchenUserPermissions:
    """KITCHEN_USER: read-only on resources, full CRUD on operations."""

    def test_organizations_forbidden(self, kitchen_user_client, org):
        assert kitchen_user_client.get("/api/organizations/").status_code == 403

    def test_users_forbidden(self, kitchen_user_client):
        assert kitchen_user_client.get("/api/users/").status_code == 403

    def test_kitchens_read_only(self, kitchen_user_client, kitchen):
        assert kitchen_user_client.get("/api/kitchens/").status_code == 200
        assert kitchen_user_client.get(f"/api/kitchens/{kitchen.id}/").status_code == 200
        assert kitchen_user_client.post("/api/kitchens/", {"name": "X"}).status_code == 403
        assert (
            kitchen_user_client.patch(f"/api/kitchens/{kitchen.id}/", {"name": "X"}).status_code
            == 403
        )
        assert kitchen_user_client.delete(f"/api/kitchens/{kitchen.id}/").status_code == 403

    def test_products_read_only(self, kitchen_user_client, product, category):
        assert kitchen_user_client.get("/api/products/").status_code == 200
        assert kitchen_user_client.get(f"/api/products/{product.id}/").status_code == 200
        assert (
            kitchen_user_client.post(
                "/api/products/",
                {"code": "X", "name": "X", "category": category.id, "unit": "kg"},
            ).status_code
            == 403
        )
        assert (
            kitchen_user_client.patch(f"/api/products/{product.id}/", {"name": "X"}).status_code
            == 403
        )
        assert kitchen_user_client.delete(f"/api/products/{product.id}/").status_code == 403

    def test_categories_read_only(self, kitchen_user_client, category):
        assert kitchen_user_client.get("/api/categories/").status_code == 200
        assert kitchen_user_client.get(f"/api/categories/{category.id}/").status_code == 200
        assert kitchen_user_client.post("/api/categories/", {"name": "X"}).status_code == 403
        assert (
            kitchen_user_client.patch(f"/api/categories/{category.id}/", {"name": "X"}).status_code
            == 403
        )
        assert kitchen_user_client.delete(f"/api/categories/{category.id}/").status_code == 403

    def test_operations_full_crud(self, kitchen_user_client, operation, kitchen, product):
        assert kitchen_user_client.get("/api/operations/").status_code == 200
        resp = kitchen_user_client.post(
            "/api/operations/",
            {
                "type": "SALE",
                "date": str(date.today()),
                "time": "15:00:00",
                "kitchen": kitchen.id,
                "product": product.id,
                "quantity": "5.000",
                "unit": "kg",
                "price": "100000.00",
            },
        )
        assert resp.status_code == 201
        assert (
            kitchen_user_client.patch(
                f"/api/operations/{operation.id}/", {"quantity": "55.000"}
            ).status_code
            == 200
        )
        assert kitchen_user_client.delete(f"/api/operations/{operation.id}/").status_code == 204

    def test_analytics(self, kitchen_user_client, product):
        assert kitchen_user_client.get("/api/analytics/dashboard/").status_code == 200
        assert (
            kitchen_user_client.get(f"/api/analytics/product-history/{product.id}/").status_code
            == 200
        )


@pytest.mark.django_db
class TestUnauthenticatedAccess:
    """All endpoints require authentication."""

    def test_all_endpoints_return_401(self, api_client):
        endpoints = [
            "/api/organizations/",
            "/api/users/",
            "/api/kitchens/",
            "/api/products/",
            "/api/categories/",
            "/api/operations/",
            "/api/analytics/dashboard/",
            "/api/auth/me/",
        ]
        for url in endpoints:
            response = api_client.get(url)
            assert response.status_code == 401, f"{url} should return 401"
