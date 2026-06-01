import time

from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel


class Order(TimeStampedModel):
    """Заказ на оплату подписки через Payme."""

    class Plan(models.TextChoices):
        BASIC = "BASIC", "Basic"
        PRO = "PRO", "Pro"
        ENTERPRISE = "ENTERPRISE", "Enterprise"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Ожидает оплаты"
        PAYING = "PAYING", "В процессе оплаты"
        PAID = "PAID", "Оплачен"
        CANCELLED = "CANCELLED", "Отменён"
        EXPIRED = "EXPIRED", "Истёк"

    # Цены в тийинах (1 UZS = 100 тийин)
    PLAN_PRICES = {
        "BASIC": 0,
        "PRO": 4_900_000,  # 49 000 UZS
        "ENTERPRISE": 19_900_000,  # 199 000 UZS
    }

    PLAN_LIMITS = {
        "BASIC": {"max_kitchens": 3, "max_users": 10},
        "PRO": {"max_kitchens": 10, "max_users": 50},
        "ENTERPRISE": {"max_kitchens": 999, "max_users": 999},
    }

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="orders",
        verbose_name="Организация",
    )
    target_plan = models.CharField(max_length=20, choices=Plan.choices, verbose_name="Целевой план")
    amount = models.BigIntegerField(verbose_name="Сумма (тийин)")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="Статус",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_orders",
        verbose_name="Создан пользователем",
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Оплачен в")
    cancelled_at = models.DateTimeField(null=True, blank=True, verbose_name="Отменён в")

    class Meta:
        verbose_name = "Заказ на подписку"
        verbose_name_plural = "Заказы на подписку"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Order #{self.id} [{self.organization}] {self.target_plan} — {self.status}"

    @property
    def is_payable(self) -> bool:
        """Заказ может быть оплачен — статус PENDING."""
        return self.status == self.Status.PENDING

    def mark_as_paid(self) -> None:
        """Пометить заказ оплаченным и обновить план организации."""
        self.status = self.Status.PAID
        self.paid_at = timezone.now()
        self.save(update_fields=["status", "paid_at", "updated_at"])

        limits = self.PLAN_LIMITS.get(self.target_plan, {})
        org = self.organization
        org.plan = self.target_plan
        org.max_kitchens = limits.get("max_kitchens", org.max_kitchens)
        org.max_users = limits.get("max_users", org.max_users)
        org.mrr = self.amount / 100  # конвертация тийин → UZS
        org.save(update_fields=["plan", "max_kitchens", "max_users", "mrr", "updated_at"])

    def cancel(self) -> None:
        """Отменить заказ."""
        self.status = self.Status.CANCELLED
        self.cancelled_at = timezone.now()
        self.save(update_fields=["status", "cancelled_at", "updated_at"])


class PaymeTransaction(TimeStampedModel):
    """Транзакция Payme, привязанная к заказу на подписку."""

    STATE_CREATED = 1
    STATE_PERFORMED = 2
    STATE_CANCELLED_BEFORE = -1
    STATE_CANCELLED_AFTER = -2

    PAYME_TIMEOUT_MS = 43_200_000  # 12 часов в миллисекундах

    payme_id = models.CharField(max_length=255, unique=True, verbose_name="ID транзакции Payme")
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payme_transactions",
        verbose_name="Заказ",
    )
    state = models.IntegerField(verbose_name="Состояние")
    amount = models.BigIntegerField(verbose_name="Сумма (тийин)")
    reason = models.SmallIntegerField(null=True, blank=True, verbose_name="Причина отмены")
    payme_time = models.BigIntegerField(default=0, verbose_name="Время создания (Payme, мс)")
    payme_create_time = models.BigIntegerField(default=0, verbose_name="Время создания у нас (мс)")
    payme_perform_time = models.BigIntegerField(default=0, verbose_name="Время проведения (мс)")
    payme_cancel_time = models.BigIntegerField(default=0, verbose_name="Время отмены (мс)")

    class Meta:
        verbose_name = "Транзакция Payme"
        verbose_name_plural = "Транзакции Payme"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"PaymeTransaction {self.payme_id} state={self.state}"

    @property
    def is_timed_out(self) -> bool:
        """Транзакция создана, но истёк 12-часовой таймаут Payme."""
        if self.state != self.STATE_CREATED:
            return False
        now_ms = int(time.time() * 1000)
        return (now_ms - self.payme_create_time) > self.PAYME_TIMEOUT_MS
