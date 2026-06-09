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
    ).exclude(plan="BASIC")
    for org in expiring:
        logger.warning("Subscription expiring: org=%s expires=%s", org.id, org.plan_expires_at)
    return {"expiring_soon": expiring.count()}


@shared_task(name="apps.payments.tasks.downgrade_expired_subscriptions_task")
def downgrade_expired_subscriptions_task():
    from django.utils import timezone

    from apps.organizations.models import Organization
    from apps.payments.models import AuditLog, PlanConfig

    grace_cutoff = timezone.now() - timezone.timedelta(days=7)
    expired_orgs = Organization.objects.filter(
        plan_expires_at__lt=grace_cutoff,
    ).exclude(plan="BASIC")

    try:
        basic_config = PlanConfig.objects.get(plan="BASIC")
    except PlanConfig.DoesNotExist:
        logger.error("downgrade_expired_subscriptions_task: BASIC PlanConfig missing")
        return {"downgraded": 0}

    downgraded = 0
    for org in expired_orgs:
        old_plan = org.plan
        org.plan = "BASIC"
        org.max_kitchens = basic_config.max_kitchens
        org.max_users = basic_config.max_users
        org.mrr = 0
        org.plan_expires_at = None
        org.save(
            update_fields=[
                "plan",
                "max_kitchens",
                "max_users",
                "mrr",
                "plan_expires_at",
                "updated_at",
            ]
        )
        AuditLog.objects.create(
            event_type=AuditLog.EventType.PLAN_REVERT,
            organization=org,
            target_type="Organization",
            target_id=org.id,
            old_value={"plan": old_plan},
            new_value={"plan": "BASIC"},
            metadata={"reason": "subscription_expired_grace_period"},
        )
        logger.info("Downgraded org=%s from %s to BASIC (grace period expired)", org.id, old_plan)
        downgraded += 1

    return {"downgraded": downgraded}
