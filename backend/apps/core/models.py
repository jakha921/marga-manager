from django.db import models


class TimeStampedModel(models.Model):
    """Абстрактная модель с временными метками."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(TimeStampedModel):
    """Абстрактная модель с привязкой к организации (мультитенантность)."""

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="%(class)ss",
        verbose_name="Организация",
    )

    class Meta:
        abstract = True
