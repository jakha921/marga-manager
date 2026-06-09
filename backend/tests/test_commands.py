import pytest
from django.core.management import call_command
from django.utils import timezone


@pytest.mark.django_db
class TestExpireStaleOrdersCommand:
    def test_expire_stale_orders_marks_old_orders(self, org, tenant_admin):
        from apps.payments.models import Order

        cutoff = timezone.now() - timezone.timedelta(hours=13)
        order = Order.objects.create(
            organization=org,
            target_plan="PRO",
            amount=4_900_000,
            status=Order.Status.PENDING,
        )
        Order.objects.filter(pk=order.pk).update(created_at=cutoff)

        call_command("expire_stale_orders")
        order.refresh_from_db()
        assert order.status == Order.Status.EXPIRED

    def test_expire_stale_orders_leaves_recent_orders(self, org, tenant_admin):
        from apps.payments.models import Order

        order = Order.objects.create(
            organization=org,
            target_plan="PRO",
            amount=4_900_000,
            status=Order.Status.PENDING,
        )

        call_command("expire_stale_orders")
        order.refresh_from_db()
        assert order.status == Order.Status.PENDING


@pytest.mark.django_db
class TestSeedDataCommand:
    def test_seed_data_runs_without_error(self):
        call_command("seed_data", "--clear")

    def test_create_test_orders_runs(self, org):
        from apps.payments.models import PlanConfig

        PlanConfig.objects.get_or_create(
            plan="PRO", defaults={"price": 4_900_000, "max_kitchens": 10, "max_users": 50}
        )
        PlanConfig.objects.get_or_create(
            plan="ENTERPRISE", defaults={"price": 9_900_000, "max_kitchens": 50, "max_users": 200}
        )
        call_command("create_test_orders", org_slug=org.slug)
