import pytest


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
