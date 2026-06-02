from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.payments.models import Order, PaymeTransaction


class Command(BaseCommand):
    help = "Помечает просроченные PENDING/PAYING заказы (старше 12 часов) как EXPIRED"

    def handle(self, *args, **options):
        timeout_hours = PaymeTransaction.PAYME_TIMEOUT_MS / 3_600_000
        cutoff = timezone.now() - timedelta(hours=timeout_hours)

        count = Order.objects.filter(
            status__in=[Order.Status.PENDING, Order.Status.PAYING],
            created_at__lt=cutoff,
        ).update(status=Order.Status.EXPIRED)

        self.stdout.write(
            self.style.SUCCESS(f"Expired {count} stale orders (older than {timeout_hours:.0f}h)")
        )
