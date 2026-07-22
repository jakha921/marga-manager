import pytest
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import User
from apps.organizations.models import Organization


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


@pytest.mark.django_db
class TestRegister:
    def test_register_creates_org_and_owner(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {
                "organizationName": "New Cafe",
                "ownerName": "Ali Valiyev",
                "phone": "+998 90 123 45 67",
                "password": "securepass123",
            },
            format="json",
        )

        assert response.status_code == 201
        assert "access" in response.data
        assert "refresh" in response.data
        user = User.objects.get(username="998901234567")
        org = user.organization
        assert user.role == User.Role.TENANT_ADMIN
        assert user.full_name == "Ali Valiyev"
        assert org.name == "New Cafe"
        assert org.phone == "998901234567"
        assert org.plan == Organization.Plan.BASIC
        assert org.status == Organization.Status.ACTIVE
        assert org.mrr == 0
        assert org.plan_expires_at is not None
        days = org.plan_expires_at - timezone.now()
        assert timezone.timedelta(days=13, hours=23) <= days <= timezone.timedelta(days=14)

    def test_register_rejects_duplicate_phone(self, api_client, tenant_admin):
        tenant_admin.username = "998901234567"
        tenant_admin.save(update_fields=["username"])

        response = api_client.post(
            "/api/auth/register/",
            {
                "organizationName": "Duplicate Cafe",
                "ownerName": "Ali Valiyev",
                "phone": "+998 90 123 45 67",
                "password": "securepass123",
            },
            format="json",
        )

        assert response.status_code == 400

    def test_register_rejects_weak_password(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {
                "organizationName": "Weak Cafe",
                "ownerName": "Ali Valiyev",
                "phone": "+998 90 765 43 21",
                "password": "123",
            },
            format="json",
        )

        assert response.status_code == 400
        assert not User.objects.filter(username="998907654321").exists()

    def test_register_ignores_public_role_and_plan_fields(self, api_client):
        response = api_client.post(
            "/api/auth/register/",
            {
                "organizationName": "Safe Cafe",
                "ownerName": "Ali Valiyev",
                "phone": "+998 90 555 44 33",
                "password": "securepass123",
                "role": "SUPER_ADMIN",
                "plan": "PRO",
                "status": "SUSPENDED",
                "maxUsers": 999,
            },
            format="json",
        )

        assert response.status_code == 201
        user = User.objects.get(username="998905554433")
        assert user.role == User.Role.TENANT_ADMIN
        assert user.organization.plan == Organization.Plan.BASIC
        assert user.organization.status == Organization.Status.ACTIVE

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
        assert response.data["organization_id"] == org.id
        assert response.data["organization_name"] == "Test Org"
        assert response.data["full_name"] == "Tenant Admin"

    def test_me_unauthenticated(self, api_client):
        response = api_client.get("/api/auth/me/")
        assert response.status_code == 401

    def test_me_super_admin_no_org(self, super_admin_client):
        response = super_admin_client.get("/api/auth/me/")
        assert response.status_code == 200
        assert response.data["role"] == "SUPER_ADMIN"
        assert response.data["organization_id"] is None


@pytest.mark.django_db
class TestUserCRUD:
    """9.1 — User CRUD via /api/users/."""

    def test_tenant_admin_can_create_user(self, tenant_admin_client, org):
        resp = tenant_admin_client.post(
            "/api/users/",
            {
                "username": "newcook",
                "password": "securepass",
                "full_name": "New Cook",
                "role": "KITCHEN_USER",
            },
        )
        assert resp.status_code == 201
        assert resp.data["role"] == "KITCHEN_USER"

    def test_kitchen_user_cannot_create_user(self, kitchen_user_client, org):
        resp = kitchen_user_client.post(
            "/api/users/",
            {
                "username": "hacker",
                "password": "securepass",
                "full_name": "Hacker",
                "role": "TENANT_ADMIN",
            },
        )
        assert resp.status_code == 403

    def test_tenant_admin_can_update_user(self, tenant_admin_client, kitchen_user):
        resp = tenant_admin_client.patch(
            f"/api/users/{kitchen_user.id}/",
            {"full_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.data["full_name"] == "Updated Name"

    def test_tenant_admin_can_delete_user(self, tenant_admin_client, kitchen_user):
        resp = tenant_admin_client.delete(f"/api/users/{kitchen_user.id}/")
        assert resp.status_code == 204

    def test_update_with_password_changes_it(self, tenant_admin_client, api_client, kitchen_user):
        resp = tenant_admin_client.patch(
            f"/api/users/{kitchen_user.id}/",
            {"password": "newsecurepass1"},
        )
        assert resp.status_code == 200
        assert "password" not in resp.data

        old_login = api_client.post(
            "/api/auth/login/",
            {"username": kitchen_user.username, "password": "pass123"},
        )
        assert old_login.status_code == 401
        new_login = api_client.post(
            "/api/auth/login/",
            {"username": kitchen_user.username, "password": "newsecurepass1"},
        )
        assert new_login.status_code == 200

    def test_update_without_password_keeps_it(self, tenant_admin_client, api_client, kitchen_user):
        resp = tenant_admin_client.patch(
            f"/api/users/{kitchen_user.id}/",
            {"full_name": "Same Password"},
        )
        assert resp.status_code == 200
        login = api_client.post(
            "/api/auth/login/",
            {"username": kitchen_user.username, "password": "pass123"},
        )
        assert login.status_code == 200

    def test_update_with_short_password_rejected(self, tenant_admin_client, kitchen_user):
        resp = tenant_admin_client.patch(
            f"/api/users/{kitchen_user.id}/",
            {"password": "short"},
        )
        assert resp.status_code == 400


@pytest.mark.django_db
class TestUserLimitEnforcement:
    def test_cannot_create_user_at_limit(self, tenant_admin_client, tenant_admin, org):
        org.max_users = 1
        org.save()
        # tenant_admin already exists and counts against the limit

        response = tenant_admin_client.post(
            "/api/users/",
            {
                "username": "extra_user",
                "password": "securepass1",
                "full_name": "Extra",
                "role": "KITCHEN_USER",
            },
        )
        assert response.status_code == 403

    def test_can_create_user_below_limit(self, tenant_admin_client, org):
        org.max_users = 50
        org.save()

        response = tenant_admin_client.post(
            "/api/users/",
            {
                "username": "new_cook",
                "password": "securepass1",
                "full_name": "New Cook",
                "role": "KITCHEN_USER",
            },
        )
        assert response.status_code == 201

    def test_super_admin_bypasses_user_limit(self, super_admin_client, org):
        org.max_users = 0
        org.save()

        response = super_admin_client.post(
            "/api/users/",
            {
                "username": "sa_user",
                "password": "securepass1",
                "full_name": "SA User",
                "role": "KITCHEN_USER",
                "organization": org.id,
            },
        )
        assert response.status_code == 201
