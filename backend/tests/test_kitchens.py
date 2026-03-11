import pytest

from apps.kitchens.models import Kitchen


@pytest.mark.django_db
class TestKitchenTenantAdmin:
    def test_list_kitchens(self, tenant_admin_client, kitchen, kitchen2):
        response = tenant_admin_client.get("/api/kitchens/")
        assert response.status_code == 200
        assert response.data["count"] == 2

    def test_create_kitchen(self, tenant_admin_client, org):
        response = tenant_admin_client.post(
            "/api/kitchens/",
            {"name": "New Kitchen"},
        )
        assert response.status_code == 201
        assert response.data["name"] == "New Kitchen"
        # organization should be auto-set from user
        assert response.data["organization"] == org.id

    def test_retrieve_kitchen(self, tenant_admin_client, kitchen):
        response = tenant_admin_client.get(f"/api/kitchens/{kitchen.id}/")
        assert response.status_code == 200
        assert response.data["name"] == "Main Kitchen"

    def test_update_kitchen(self, tenant_admin_client, kitchen):
        response = tenant_admin_client.patch(
            f"/api/kitchens/{kitchen.id}/",
            {"name": "Updated Kitchen"},
        )
        assert response.status_code == 200
        assert response.data["name"] == "Updated Kitchen"

    def test_delete_kitchen(self, tenant_admin_client, kitchen):
        response = tenant_admin_client.delete(f"/api/kitchens/{kitchen.id}/")
        assert response.status_code == 204
        assert not Kitchen.objects.filter(id=kitchen.id).exists()


@pytest.mark.django_db
class TestKitchenKitchenUser:
    def test_list_kitchens(self, kitchen_user_client, kitchen):
        response = kitchen_user_client.get("/api/kitchens/")
        assert response.status_code == 200

    def test_retrieve_kitchen(self, kitchen_user_client, kitchen):
        response = kitchen_user_client.get(f"/api/kitchens/{kitchen.id}/")
        assert response.status_code == 200

    def test_create_forbidden(self, kitchen_user_client):
        response = kitchen_user_client.post(
            "/api/kitchens/",
            {"name": "Forbidden Kitchen"},
        )
        assert response.status_code == 403

    def test_update_forbidden(self, kitchen_user_client, kitchen):
        response = kitchen_user_client.patch(
            f"/api/kitchens/{kitchen.id}/",
            {"name": "Hack"},
        )
        assert response.status_code == 403

    def test_delete_forbidden(self, kitchen_user_client, kitchen):
        response = kitchen_user_client.delete(f"/api/kitchens/{kitchen.id}/")
        assert response.status_code == 403


@pytest.mark.django_db
class TestKitchenTenantIsolation:
    def test_tenant_admin_cannot_see_other_org_kitchens(
        self, tenant_admin_client, kitchen, kitchen_other_org
    ):
        response = tenant_admin_client.get("/api/kitchens/")
        assert response.status_code == 200
        kitchen_ids = [k["id"] for k in response.data["results"]]
        assert kitchen.id in kitchen_ids
        assert kitchen_other_org.id not in kitchen_ids

    def test_tenant_admin_cannot_retrieve_other_org_kitchen(
        self, tenant_admin_client, kitchen_other_org
    ):
        response = tenant_admin_client.get(f"/api/kitchens/{kitchen_other_org.id}/")
        assert response.status_code == 404

    def test_super_admin_sees_all_kitchens(self, super_admin_client, kitchen, kitchen_other_org):
        response = super_admin_client.get("/api/kitchens/")
        assert response.status_code == 200
        assert response.data["count"] >= 2


@pytest.mark.django_db
class TestKitchenUnauthenticated:
    def test_list_unauthorized(self, api_client):
        response = api_client.get("/api/kitchens/")
        assert response.status_code == 401
