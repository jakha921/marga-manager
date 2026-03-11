from django.db import models

from apps.core.models import TimeStampedModel


class Organization(TimeStampedModel):
    """Организация (тенант) в SaaS-системе."""

    class Plan(models.TextChoices):
        BASIC = "BASIC", "Basic"
        PRO = "PRO", "Pro"
        ENTERPRISE = "ENTERPRISE", "Enterprise"

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        SUSPENDED = "SUSPENDED", "Suspended"

    name = models.CharField(max_length=200, verbose_name="Название")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug")
    plan = models.CharField(
        max_length=20, choices=Plan.choices, default=Plan.BASIC, verbose_name="Тарифный план"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.ACTIVE, verbose_name="Статус"
    )
    max_kitchens = models.PositiveIntegerField(default=3, verbose_name="Макс. кухонь")
    max_users = models.PositiveIntegerField(default=10, verbose_name="Макс. пользователей")
    mrr = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="MRR")
    contact_name = models.CharField(max_length=200, blank=True, verbose_name="Контактное лицо")
    phone = models.CharField(max_length=30, blank=True, verbose_name="Телефон")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Адрес")
    currency = models.CharField(max_length=10, default="UZS", verbose_name="Валюта")
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0, verbose_name="Ставка налога (%)"
    )
    low_stock_threshold = models.PositiveIntegerField(
        default=10, verbose_name="Порог низкого запаса"
    )

    class Meta:
        verbose_name = "Организация"
        verbose_name_plural = "Организации"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name

    def can_add_kitchen(self) -> bool:
        return self.kitchens.count() < self.max_kitchens

    def can_add_user(self) -> bool:
        return self.users.count() < self.max_users
