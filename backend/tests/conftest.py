from datetime import date, time

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.kitchens.models import Kitchen
from apps.operations.models import OperationEntry
from apps.organizations.models import Organization
from apps.products.models import Category, Product


@pytest.fixture
def org(db):
    return Organization.objects.create(
        name="Test Org",
        slug="test-org",
        plan="PRO",
        status="ACTIVE",
        max_kitchens=5,
        max_users=20,
    )


@pytest.fixture
def org2(db):
    return Organization.objects.create(
        name="Other Org",
        slug="other-org",
        plan="BASIC",
        status="ACTIVE",
        max_kitchens=3,
        max_users=10,
    )


@pytest.fixture
def super_admin(db):
    return User.objects.create_user(
        username="superadmin",
        password="pass123",
        role="SUPER_ADMIN",
        full_name="Super Admin",
    )


@pytest.fixture
def tenant_admin(db, org):
    return User.objects.create_user(
        username="tenantadmin",
        password="pass123",
        role="TENANT_ADMIN",
        full_name="Tenant Admin",
        organization=org,
    )


@pytest.fixture
def tenant_admin2(db, org2):
    return User.objects.create_user(
        username="tenantadmin2",
        password="pass123",
        role="TENANT_ADMIN",
        full_name="Tenant Admin 2",
        organization=org2,
    )


@pytest.fixture
def kitchen_user(db, org):
    return User.objects.create_user(
        username="kitchenuser",
        password="pass123",
        role="KITCHEN_USER",
        full_name="Kitchen User",
        organization=org,
    )


@pytest.fixture
def kitchen(db, org):
    return Kitchen.objects.create(name="Main Kitchen", organization=org)


@pytest.fixture
def kitchen2(db, org):
    return Kitchen.objects.create(name="Branch Kitchen", organization=org)


@pytest.fixture
def kitchen_other_org(db, org2):
    return Kitchen.objects.create(name="Other Kitchen", organization=org2)


@pytest.fixture
def category(db, org):
    return Category.objects.create(name="Raw Materials", organization=org)


@pytest.fixture
def category_other_org(db, org2):
    return Category.objects.create(name="Drinks", organization=org2)


@pytest.fixture
def product(db, org, category):
    return Product.objects.create(
        code="MEAT001",
        name="Beef",
        category=category,
        unit="kg",
        organization=org,
    )


@pytest.fixture
def product_other_org(db, org2, category_other_org):
    return Product.objects.create(
        code="DRINK001",
        name="Cola",
        category=category_other_org,
        unit="l",
        organization=org2,
    )


@pytest.fixture
def operation(db, org, kitchen, product):
    return OperationEntry.objects.create(
        type="INCOMING",
        date=date.today(),
        time=time(10, 0),
        kitchen=kitchen,
        product=product,
        quantity=50,
        unit="kg",
        price=85000,
        organization=org,
    )


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def super_admin_client(api_client, super_admin):
    api_client.force_authenticate(user=super_admin)
    return api_client


@pytest.fixture
def tenant_admin_client(api_client, tenant_admin):
    api_client.force_authenticate(user=tenant_admin)
    return api_client


@pytest.fixture
def tenant_admin2_client(tenant_admin2):
    client = APIClient()
    client.force_authenticate(user=tenant_admin2)
    return client


@pytest.fixture
def kitchen_user_client(api_client, kitchen_user):
    api_client.force_authenticate(user=kitchen_user)
    return api_client
