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
