import logging

from celery import shared_task

logger = logging.getLogger("apps.payments")


@shared_task(name="apps.payments.tasks.expire_stale_orders_task")
def expire_stale_orders_task():
    from django.utils import timezone

    from apps.payments.models import Order, PaymeTransaction

    cutoff = timezone.now() - timezone.timedelta(milliseconds=PaymeTransaction.PAYME_TIMEOUT_MS)
    updated = Order.objects.filter(
        status__in=[Order.Status.PENDING, Order.Status.PAYING],
        created_at__lt=cutoff,
    ).update(status=Order.Status.EXPIRED)
    if updated:
        logger.info("Expired %d stale orders", updated)
    return {"expired": updated}


@shared_task(name="apps.payments.tasks.check_expiring_subscriptions_task")
def check_expiring_subscriptions_task():
    from django.utils import timezone

    from apps.organizations.models import Organization

    threshold = timezone.now() + timezone.timedelta(days=3)
    expiring = Organization.objects.filter(
        plan_expires_at__isnull=False,
        plan_expires_at__lte=threshold,
        plan_expires_at__gt=timezone.now(),
    )
    for org in expiring:
        logger.warning("Subscription expiring: org=%s expires=%s", org.id, org.plan_expires_at)
    return {"expiring_soon": expiring.count()}


@shared_task(name="apps.payments.tasks.downgrade_expired_subscriptions_task")
def downgrade_expired_subscriptions_task():
    from django.db import transaction
    from django.utils import timezone

    from apps.organizations.models import Organization
    from apps.payments.models import AuditLog

    suspended = 0
    with transaction.atomic():
        # select_for_update: параллельный запуск задачи не даст двойной suspend
        # и дублей AuditLog (Postgres перепроверяет WHERE после снятия блокировки)
        expired_orgs = Organization.objects.select_for_update().filter(
            plan_expires_at__lt=timezone.now(),
            status=Organization.Status.ACTIVE,
        )
        for org in expired_orgs:
            old_status = org.status
            org.status = Organization.Status.SUSPENDED
            org.save(update_fields=["status", "updated_at"])
            AuditLog.objects.create(
                event_type=AuditLog.EventType.ORG_SUSPENDED,
                organization=org,
                target_type="Organization",
                target_id=org.id,
                old_value={"status": old_status},
                new_value={"status": org.status},
                metadata={"reason": "subscription_expired"},
            )
            logger.info("Suspended expired org=%s", org.id)
            suspended += 1

    return {"suspended": suspended}
