from django.core.management.base import BaseCommand

from apps.organizations.models import Organization
from apps.payments.models import Order


class Command(BaseCommand):
    help = "Создаёт тестовые PENDING заказы для проверки Payme CheckPerformTransaction"

    def add_arguments(self, parser):
        parser.add_argument("--org-slug", default="marga-kitchen", help="Slug организации")

    def handle(self, *args, **options):
        slug = options["org_slug"]
        try:
            org = Organization.objects.get(slug=slug)
        except Organization.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Организация '{slug}' не найдена"))
            return

        plans = [
            ("PRO", 4_900_000),
            ("ENTERPRISE", 19_900_000),
        ]

        for plan, amount in plans:
            existing = Order.objects.filter(
                organization=org,
                target_plan=plan,
                status__in=[Order.Status.PENDING, Order.Status.PAYING],
            ).first()
            if existing:
                self.stdout.write(
                    self.style.WARNING(
                        f"[SKIP] {plan}: уже есть заказ id={existing.id} status={existing.status}"
                    )
                )
                continue

            order = Order.objects.create(
                organization=org,
                target_plan=plan,
                amount=amount,
                status=Order.Status.PENDING,
            )
            self.stdout.write(
                self.style.SUCCESS(f"[OK] {plan}: создан заказ id={order.id} amount={order.amount}")
            )
