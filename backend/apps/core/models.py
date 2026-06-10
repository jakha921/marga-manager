import logging

from django.db import models
from django.utils import timezone

logger = logging.getLogger("apps.core")


class SoftDeleteManager(models.Manager):
    """Менеджер, фильтрующий мягко удалённые записи по умолчанию."""

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class AllObjectsManager(models.Manager):
    """Менеджер, возвращающий все записи включая удалённые."""

    pass


class SoftDeleteModel(models.Model):
    """Abstract mixin для мягкого удаления."""

    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name="Удалено в")

    objects = SoftDeleteManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at"])
        logger.info("SoftDelete: %s #%s deleted", self.__class__.__name__, self.pk)

    def hard_delete(self):
        super().delete()

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=["deleted_at"])

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


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
