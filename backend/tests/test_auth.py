import pytest
from rest_framework_simplejwt.tokens import AccessToken


@pytest.mark.django_db
class TestLogin:
    def test_login_valid_credentials(self, api_client, tenant_admin):
        response = api_client.post(
            "/api/auth/login/",
            {"username": "tenantadmin", "password": "pass123"},
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_invalid_credentials(self, api_client, tenant_admin):
        response = api_client.post(
            "/api/auth/login/",
            {"username": "tenantadmin", "password": "wrongpass"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, api_client):
        response = api_client.post(
            "/api/auth/login/",
            {"username": "noone", "password": "pass123"},
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestTokenRefresh:
    def test_refresh_token_works(self, api_client, tenant_admin):
        login = api_client.post(
            "/api/auth/login/",
            {"username": "tenantadmin", "password": "pass123"},
        )
        refresh_token = login.data["refresh"]

        response = api_client.post(
            "/api/auth/refresh/",
            {"refresh": refresh_token},
        )
        assert response.status_code == 200
        assert "access" in response.data

    def test_refresh_with_invalid_token(self, api_client):
        response = api_client.post(
            "/api/auth/refresh/",
            {"refresh": "invalid-token"},
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestTokenClaims:
    def test_token_contains_role_and_org_id(self, api_client, tenant_admin, org):
        login = api_client.post(
            "/api/auth/login/",
            {"username": "tenantadmin", "password": "pass123"},
        )
        token = AccessToken(login.data["access"])
        assert token["role"] == "TENANT_ADMIN"
        assert token["org_id"] == str(org.id)
        assert token["full_name"] == "Tenant Admin"

    def test_token_claims_super_admin_no_org(self, api_client, super_admin):
        login = api_client.post(
            "/api/auth/login/",
            {"username": "superadmin", "password": "pass123"},
        )
        token = AccessToken(login.data["access"])
        assert token["role"] == "SUPER_ADMIN"
        assert token["org_id"] is None


@pytest.mark.django_db
class TestMeEndpoint:
    def test_me_returns_current_user(self, tenant_admin_client, tenant_admin, org):
        response = tenant_admin_client.get("/api/auth/me/")
        assert response.status_code == 200
        assert response.data["username"] == "tenantadmin"
        assert response.data["role"] == "TENANT_ADMIN"
        assert response.data["organization"] == org.id
        assert response.data["organization_name"] == "Test Org"
        assert response.data["full_name"] == "Tenant Admin"

    def test_me_unauthenticated(self, api_client):
        response = api_client.get("/api/auth/me/")
        assert response.status_code == 401

    def test_me_super_admin_no_org(self, super_admin_client):
        response = super_admin_client.get("/api/auth/me/")
        assert response.status_code == 200
        assert response.data["role"] == "SUPER_ADMIN"
        assert response.data["organization"] is None
