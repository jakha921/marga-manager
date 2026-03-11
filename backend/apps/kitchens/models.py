from django.db import models

from apps.core.models import TenantModel


class Kitchen(TenantModel):
    """Кухня (локация/филиал) организации."""

    name = models.CharField(max_length=200, verbose_name="Название")
    is_active = models.BooleanField(default=True, verbose_name="Активна")

    class Meta:
        verbose_name = "Кухня"
        verbose_name_plural = "Кухни"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name
