import pytest
from django.core.cache import cache
from rest_framework.throttling import SimpleRateThrottle

from apps.accounts.throttles import LoginRateThrottle


@pytest.mark.django_db
class TestLoginRateLimit:
    def test_throttle_class_configured_on_login_view(self):
        from apps.accounts.views import CustomTokenObtainPairView

        throttle_classes = CustomTokenObtainPairView.throttle_classes
        assert any(issubclass(cls, LoginRateThrottle) for cls in throttle_classes), (
            "LoginRateThrottle must be set on CustomTokenObtainPairView"
        )
        assert LoginRateThrottle.scope == "login"

    def test_login_rate_limit_triggered(self, api_client, monkeypatch):
        # Patch THROTTLE_RATES at class level — override_settings doesn't update
        # this class attribute because it is bound at import time.
        monkeypatch.setattr(SimpleRateThrottle, "THROTTLE_RATES", {"login": "2/minute"})
        cache.clear()

        payload = {"username": "nobody", "password": "wrong"}
        r1 = api_client.post("/api/auth/login/", payload)
        r2 = api_client.post("/api/auth/login/", payload)
        r3 = api_client.post("/api/auth/login/", payload)

        assert r1.status_code == 401  # wrong creds, not throttled yet
        assert r2.status_code == 401
        assert r3.status_code == 429  # exceeded 2/min limit

    def test_successful_login_not_throttled_by_default(self, api_client, tenant_admin):
        response = api_client.post(
            "/api/auth/login/",
            {"username": "tenantadmin", "password": "pass123"},
        )
        assert response.status_code == 200
        assert "access" in response.data
