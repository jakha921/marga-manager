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
    previous_plan = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Предыдущий план"
    )

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

        try:
            config = PlanConfig.objects.get(plan=self.target_plan)
            max_kitchens = config.max_kitchens
            max_users = config.max_users
        except PlanConfig.DoesNotExist:
            max_kitchens = None
            max_users = None

        org = self.organization
        self.previous_plan = org.plan
        self.save(update_fields=["previous_plan", "updated_at"])
        org.plan = self.target_plan
        if max_kitchens is not None:
            org.max_kitchens = max_kitchens
        if max_users is not None:
            org.max_users = max_users
        org.mrr = self.amount / 100  # конвертация тийин → UZS
        org.save(update_fields=["plan", "max_kitchens", "max_users", "mrr", "updated_at"])

    def revert_plan(self) -> None:
        """Откатить план организации к предыдущему (вызывается при отмене выполненной транзакции)."""
        if not self.previous_plan:
            return
        try:
            config = PlanConfig.objects.get(plan=self.previous_plan)
        except PlanConfig.DoesNotExist:
            return
        org = self.organization
        org.plan = self.previous_plan
        org.max_kitchens = config.max_kitchens
        org.max_users = config.max_users
        org.save(update_fields=["plan", "max_kitchens", "max_users", "updated_at"])

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


class PlanConfig(TimeStampedModel):
    """Конфигурация тарифных планов — управляется через Django Admin без деплоя."""

    class Plan(models.TextChoices):
        BASIC = "BASIC", "Basic"
        PRO = "PRO", "Pro"
        ENTERPRISE = "ENTERPRISE", "Enterprise"

    plan = models.CharField(max_length=20, choices=Plan.choices, unique=True, verbose_name="План")
    price = models.BigIntegerField(
        verbose_name="Цена (тийин)",
        help_text="Цена в тийинах (1 UZS = 100 тийин). BASIC = 0 (бесплатно).",
    )
    max_kitchens = models.PositiveIntegerField(verbose_name="Макс. кухонь")
    max_users = models.PositiveIntegerField(verbose_name="Макс. пользователей")
    is_active = models.BooleanField(default=True, verbose_name="Активен")

    class Meta:
        verbose_name = "Тариф (PlanConfig)"
        verbose_name_plural = "Тарифы (PlanConfig)"
        ordering = ["plan"]

    def __str__(self) -> str:
        return f"{self.plan} — {self.price // 100:,} UZS"
