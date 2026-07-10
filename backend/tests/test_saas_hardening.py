import os
import subprocess
import sys
import warnings
from pathlib import Path

import pytest
from django.core.paginator import UnorderedObjectListWarning

from apps.organizations.models import Organization


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("client_fixture", "url"),
    [
        ("super_admin_client", "/api/organizations/"),
        ("tenant_admin_client", "/api/users/"),
    ],
)
def test_paginated_lists_have_deterministic_order(request, client_fixture, url):
    client = request.getfixturevalue(client_fixture)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        response = client.get(url)

    assert response.status_code == 200
    assert not [
        item for item in caught if issubclass(item.category, UnorderedObjectListWarning)
    ]


@pytest.mark.django_db
def test_super_admin_can_create_organization_without_slug(super_admin_client):
    response = super_admin_client.post(
        "/api/organizations/",
        {
            "name": "Smoke Test Org",
            "contactName": "Smoke Owner",
            "plan": "BASIC",
            "status": "ACTIVE",
            "maxKitchens": 1,
            "maxUsers": 2,
            "mrr": 0,
        },
        format="json",
    )

    assert response.status_code == 201
    org = Organization.objects.get(pk=response.data["id"])
    assert org.slug == "smoke-test-org"


@pytest.mark.parametrize(
    "missing_var",
    ["PAYME_MERCHANT_ID", "PAYME_MERCHANT_KEY", "PAYME_CALLBACK_URL"],
)
def test_prod_settings_require_payme_env(missing_var):
    backend_dir = Path(__file__).resolve().parents[1]
    env = os.environ.copy()
    env.update(
        {
            "SECRET_KEY": "test-secret-key",
            "POSTGRES_PASSWORD": "test-postgres-password",
            "PAYME_MERCHANT_ID": "test-merchant",
            "PAYME_MERCHANT_KEY": "test-key",
            "PAYME_CALLBACK_URL": "https://marga.fullfocus.dev/settings",
        }
    )
    env.pop(missing_var)

    result = subprocess.run(
        [sys.executable, "-c", "import config.settings.prod"],
        cwd=backend_dir,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert missing_var in result.stderr
