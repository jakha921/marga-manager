import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext


@pytest.mark.django_db
class TestOrganizationSuperAdmin:
    def test_list_organizations(self, super_admin_client, org, org2):
        response = super_admin_client.get("/api/organizations/")
        assert response.status_code == 200
        assert response.data["count"] == 2

    def test_create_organization(self, super_admin_client):
        response = super_admin_client.post(
            "/api/organizations/",
            {
                "name": "New Org",
                "slug": "new-org",
                "plan": "BASIC",
                "status": "ACTIVE",
                "max_kitchens": 3,
                "max_users": 10,
            },
        )
        assert response.status_code == 201
        assert response.data["name"] == "New Org"
        assert response.data["slug"] == "new-org"

    def test_retrieve_organization(self, super_admin_client, org):
        response = super_admin_client.get(f"/api/organizations/{org.id}/")
        assert response.status_code == 200
        assert response.data["name"] == "Test Org"
        assert "kitchen_count" in response.data
        assert "user_count" in response.data

    def test_update_organization(self, super_admin_client, org):
        response = super_admin_client.patch(
            f"/api/organizations/{org.id}/",
            {"name": "Updated Org"},
        )
        assert response.status_code == 200
        assert response.data["name"] == "Updated Org"

    def test_delete_organization(self, super_admin_client, org):
        response = super_admin_client.delete(f"/api/organizations/{org.id}/")
        assert response.status_code == 204

    def test_super_admin_can_change_plan(self, super_admin_client, org):
        response = super_admin_client.patch(
            f"/api/organizations/{org.id}/",
            {"plan": "BASIC"},
        )
        assert response.status_code == 200
        assert response.data["plan"] == "BASIC"

    def test_list_no_n_plus_one(self, super_admin_client, org, org2):
        # Regression: kitchen_count and user_count must come from annotate(), not .count() per row
        with CaptureQueriesContext(connection) as ctx:
            response = super_admin_client.get("/api/organizations/")
        assert response.status_code == 200
        # 1 query for the annotated list + 1 for pagination count — well under N+1 territory
        assert len(ctx.captured_queries) <= 3, (
            f"Too many queries ({len(ctx.captured_queries)}): N+1 regression in OrganizationViewSet"
        )


@pytest.mark.django_db
class TestOrganizationTenantAdmin:
    def test_list_own_org(self, tenant_admin_client, org, org2):
        response = tenant_admin_client.get("/api/organizations/")
        assert response.status_code == 200
        # TENANT_ADMIN видит только свою организацию
        assert response.data["count"] == 1
        assert response.data["results"][0]["id"] == org.id

    def test_retrieve_own_org(self, tenant_admin_client, org):
        response = tenant_admin_client.get(f"/api/organizations/{org.id}/")
        assert response.status_code == 200
        assert response.data["name"] == org.name

    def test_retrieve_other_org_forbidden(self, tenant_admin_client, org2):
        response = tenant_admin_client.get(f"/api/organizations/{org2.id}/")
        assert response.status_code == 404

    def test_update_own_org(self, tenant_admin_client, org):
        response = tenant_admin_client.patch(
            f"/api/organizations/{org.id}/",
            {"name": "Updated Name"},
        )
        assert response.status_code == 200
        assert response.data["name"] == "Updated Name"

    def test_tenant_admin_cannot_change_plan(self, tenant_admin_client, org):
        # plan is read_only for TENANT_ADMIN — silently ignored, not an error
        response = tenant_admin_client.patch(
            f"/api/organizations/{org.id}/",
            {"plan": "BASIC"},
        )
        assert response.status_code == 200
        org.refresh_from_db()
        assert org.plan == "PRO"  # unchanged

    def test_create_forbidden(self, tenant_admin_client):
        response = tenant_admin_client.post(
            "/api/organizations/",
            {"name": "X", "slug": "x"},
        )
        assert response.status_code == 403

    def test_delete_forbidden(self, tenant_admin_client, org):
        response = tenant_admin_client.delete(f"/api/organizations/{org.id}/")
        assert response.status_code == 403


@pytest.mark.django_db
class TestOrganizationKitchenUser:
    def test_list_forbidden(self, kitchen_user_client):
        response = kitchen_user_client.get("/api/organizations/")
        assert response.status_code == 403

    def test_create_forbidden(self, kitchen_user_client):
        response = kitchen_user_client.post(
            "/api/organizations/",
            {"name": "X", "slug": "x"},
        )
        assert response.status_code == 403

    def test_retrieve_forbidden(self, kitchen_user_client, org):
        response = kitchen_user_client.get(f"/api/organizations/{org.id}/")
        assert response.status_code == 403

    def test_delete_forbidden(self, kitchen_user_client, org):
        response = kitchen_user_client.delete(f"/api/organizations/{org.id}/")
        assert response.status_code == 403


@pytest.mark.django_db
class TestOrganizationUnauthenticated:
    def test_list_unauthorized(self, api_client):
        response = api_client.get("/api/organizations/")
        assert response.status_code == 401


@pytest.mark.django_db
class TestOrganizationLimits:
    def test_can_add_kitchen_true_when_below_limit(self, org):
        org.max_kitchens = 10
        org.save()
        assert org.can_add_kitchen() is True

    def test_can_add_kitchen_false_when_at_limit(self, org, db):
        from apps.kitchens.models import Kitchen

        org.max_kitchens = 1
        org.save()
        Kitchen.objects.create(name="Kitchen 1", organization=org)
        assert org.can_add_kitchen() is False

    def test_can_add_user_true_when_below_limit(self, org):
        org.max_users = 100
        org.save()
        assert org.can_add_user() is True

    def test_can_add_user_false_when_at_limit(self, org, db):
        from apps.accounts.models import User

        org.max_users = 1
        org.save()
        # One user already exists (tenant_admin from conftest)
        current_count = org.users.count()
        for i in range(org.max_users - current_count + 1):
            User.objects.create_user(
                username=f"extra_user_{i}",
                password="pass123",
                role="KITCHEN_USER",
                organization=org,
            )
        assert org.can_add_user() is False
