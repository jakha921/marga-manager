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
    from apps.payments.models import AuditLog, Order, PlanConfig

    def _basic_limits():
        try:
            basic = PlanConfig.objects.get(plan=Organization.Plan.BASIC, is_active=True)
            return basic.max_kitchens, basic.max_users
        except PlanConfig.DoesNotExist:
            return 1, 10

    suspended = 0
    downgraded = 0
    with transaction.atomic():
        # select_for_update: параллельный запуск задачи не даст двойной suspend
        # и дублей AuditLog (Postgres перепроверяет WHERE после снятия блокировки)
        expired_orgs = Organization.objects.select_for_update().filter(
            plan_expires_at__lt=timezone.now(),
            status=Organization.Status.ACTIVE,
        )
        for org in expired_orgs:
            has_paid = Order.objects.filter(organization=org, status=Order.Status.PAID).exists()

            # Никогда не платили + тариф выше Basic → закончился триал:
            # мягко переводим на Basic (бесплатный минимум), не блокируем.
            if not has_paid and org.plan != Organization.Plan.BASIC:
                old_plan = org.plan
                org.plan = Organization.Plan.BASIC
                org.max_kitchens, org.max_users = _basic_limits()
                org.plan_expires_at = None
                org.save(
                    update_fields=[
                        "plan",
                        "max_kitchens",
                        "max_users",
                        "plan_expires_at",
                        "updated_at",
                    ]
                )
                AuditLog.objects.create(
                    event_type=AuditLog.EventType.PLAN_CHANGE,
                    organization=org,
                    target_type="Organization",
                    target_id=org.id,
                    old_value={"plan": old_plan},
                    new_value={"plan": org.plan},
                    metadata={"reason": "trial_ended"},
                )
                logger.info("Trial ended, downgraded org=%s to BASIC", org.id)
                downgraded += 1
                continue

            # Платившие клиенты с истёкшей подпиской → приостановка.
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

    return {"suspended": suspended, "downgraded": downgraded}
