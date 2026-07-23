from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Пользователь системы с ролью и привязкой к организации."""

    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        TENANT_ADMIN = "TENANT_ADMIN", "Tenant Admin"
        KITCHEN_USER = "KITCHEN_USER", "Kitchen User"

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="Организация",
    )
    full_name = models.CharField(max_length=200, blank=True, verbose_name="Полное имя")
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.KITCHEN_USER,
        verbose_name="Роль",
    )

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"

    def __str__(self) -> str:
        return self.full_name or self.username


class PasswordResetRequest(models.Model):
    """Заявка на сброс пароля: пользователь оставляет телефон, админ сбрасывает."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Ожидает"
        RESOLVED = "RESOLVED", "Обработана"

    phone = models.CharField(max_length=20, verbose_name="Телефон")
    note = models.CharField(max_length=300, blank=True, verbose_name="Комментарий")
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING, verbose_name="Статус"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Создана")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Обработана в")
    resolved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reset_requests",
        verbose_name="Кто обработал",
    )

    class Meta:
        verbose_name = "Заявка на сброс пароля"
        verbose_name_plural = "Заявки на сброс пароля"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.phone} ({self.status})"
