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
        assert response.data["plan_started_at"] is not None
        assert response.data["plan_expires_at"] is not None

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

    def test_user_limit_enforced_via_api(self, tenant_admin_client, org):
        org.max_users = org.users.count()
        org.save()

        response = tenant_admin_client.post(
            "/api/users/",
            {"username": "over_limit", "password": "pass12345", "role": "KITCHEN_USER"},
            format="json",
        )
        assert response.status_code == 403

    def test_user_created_below_limit_via_api(self, tenant_admin_client, org):
        org.max_users = org.users.count() + 1
        org.save()

        response = tenant_admin_client.post(
            "/api/users/",
            {"username": "within_limit", "password": "pass12345", "role": "KITCHEN_USER"},
            format="json",
        )
        assert response.status_code == 201


@pytest.mark.django_db
class TestExtendSubscription:
    def test_super_admin_extends_expired_org(self, super_admin_client, org):
        from django.utils import timezone

        org.status = "SUSPENDED"
        org.plan_expires_at = timezone.now() - timezone.timedelta(days=5)
        org.save(update_fields=["status", "plan_expires_at"])

        resp = super_admin_client.post(
            f"/api/organizations/{org.id}/extend_subscription/", {"days": 30}, format="json"
        )
        assert resp.status_code == 200
        org.refresh_from_db()
        assert org.status == "ACTIVE"
        # Истёкшая подписка продлевается от «сейчас», а не от прошлой даты
        assert org.plan_expires_at > timezone.now() + timezone.timedelta(days=29)

    def test_extend_adds_to_future_expiry(self, super_admin_client, org):
        from django.utils import timezone

        future = timezone.now() + timezone.timedelta(days=10)
        org.plan_expires_at = future
        org.save(update_fields=["plan_expires_at"])

        resp = super_admin_client.post(
            f"/api/organizations/{org.id}/extend_subscription/", {"days": 30}, format="json"
        )
        assert resp.status_code == 200
        org.refresh_from_db()
        assert abs((org.plan_expires_at - (future + timezone.timedelta(days=30))).seconds) < 5

    def test_tenant_admin_cannot_extend(self, tenant_admin_client, org):
        resp = tenant_admin_client.post(
            f"/api/organizations/{org.id}/extend_subscription/", {"days": 30}, format="json"
        )
        assert resp.status_code == 403

    def test_invalid_days_rejected(self, super_admin_client, org):
        resp = super_admin_client.post(
            f"/api/organizations/{org.id}/extend_subscription/", {"days": 9999}, format="json"
        )
        assert resp.status_code == 400


@pytest.mark.django_db
class TestSuspendedOrgBlocking:
    def test_suspended_org_api_blocked_for_tenant_admin(self, tenant_admin_client, org):
        org.status = "SUSPENDED"
        org.save()
        response = tenant_admin_client.get("/api/kitchens/")
        assert response.status_code == 403

    def test_suspended_org_api_blocked_for_kitchen_user(self, kitchen_user_client, org):
        org.status = "SUSPENDED"
        org.save()
        response = kitchen_user_client.get("/api/kitchens/")
        assert response.status_code == 403

    def test_super_admin_not_blocked_for_suspended_org(self, super_admin_client, org):
        org.status = "SUSPENDED"
        org.save()
        response = super_admin_client.get("/api/kitchens/")
        assert response.status_code == 200

    def test_active_org_not_blocked(self, tenant_admin_client, org):
        org.status = "ACTIVE"
        org.save()
        response = tenant_admin_client.get("/api/kitchens/")
        assert response.status_code == 200

    def test_login_not_blocked_for_suspended_org(self, api_client, tenant_admin, org):
        org.status = "SUSPENDED"
        org.save()
        response = api_client.post(
            "/api/auth/login/",
            {"username": tenant_admin.username, "password": "pass123"},
        )
        assert response.status_code == 200


@pytest.mark.django_db
class TestSoftDeleteMixin:
    """Тесты SoftDeleteModel через Organization после применения миксина."""

    def _make_org(self, slug_suffix="sd"):
        from apps.organizations.models import Organization

        return Organization.objects.create(
            name=f"SoftDel Org {slug_suffix}",
            slug=f"softdel-org-{slug_suffix}",
        )

    def test_soft_delete_sets_deleted_at(self):
        from apps.organizations.models import Organization

        org = self._make_org("1")
        org_id = org.pk
        org.delete()
        obj = Organization.all_objects.get(pk=org_id)
        assert obj.deleted_at is not None

    def test_soft_deleted_not_in_objects(self):
        from apps.organizations.models import Organization

        org = self._make_org("2")
        org_id = org.pk
        org.delete()
        assert not Organization.objects.filter(pk=org_id).exists()

    def test_soft_deleted_in_all_objects(self):
        from apps.organizations.models import Organization

        org = self._make_org("3")
        org_id = org.pk
        org.delete()
        assert Organization.all_objects.filter(pk=org_id).exists()

    def test_restore_clears_deleted_at(self):
        org = self._make_org("4")
        org.delete()
        org.restore()
        assert org.deleted_at is None


@pytest.mark.django_db
class TestOrganizationSoftDelete:
    def test_organization_soft_delete_via_api(self, super_admin_client, org2):
        from apps.organizations.models import Organization

        org_id = org2.pk
        response = super_admin_client.delete(f"/api/organizations/{org_id}/")
        assert response.status_code == 204
        assert Organization.all_objects.filter(pk=org_id).exists()

    def test_deleted_org_not_in_list(self, super_admin_client, org2):
        org_id = org2.pk
        org2.delete()
        response = super_admin_client.get("/api/organizations/")
        assert response.status_code == 200
        ids = [o["id"] for o in response.data["results"]]
        assert org_id not in ids


@pytest.mark.django_db
class TestOrganizationDetailEndpoint:
    def test_super_admin_can_get_org_detail(self, super_admin_client, org, kitchen):
        response = super_admin_client.get(f"/api/organizations/{org.id}/detail_view/")
        assert response.status_code == 200
        assert "kitchens" in response.data
        assert "products_count" in response.data
        assert "operations_count" in response.data

    def test_tenant_admin_cannot_get_org_detail(self, tenant_admin_client, org):
        response = tenant_admin_client.get(f"/api/organizations/{org.id}/detail_view/")
        assert response.status_code == 403
