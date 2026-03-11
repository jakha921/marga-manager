from django.db import models

from apps.core.models import TenantModel


class OperationEntry(TenantModel):
    """Запись операции (приход, расход, перемещение, продажа)."""

    class Type(models.TextChoices):
        INCOMING = "INCOMING", "Приход"
        DAILY = "DAILY", "Ежедневный расход"
        TRANSFER = "TRANSFER", "Перемещение"
        SALE = "SALE", "Продажа"

    type = models.CharField(max_length=20, choices=Type.choices, verbose_name="Тип операции")
    date = models.DateField(verbose_name="Дата")
    time = models.TimeField(verbose_name="Время")
    kitchen = models.ForeignKey(
        "kitchens.Kitchen",
        on_delete=models.CASCADE,
        related_name="operations",
        verbose_name="Кухня",
    )
    to_kitchen = models.ForeignKey(
        "kitchens.Kitchen",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incoming_transfers",
        verbose_name="Кухня-получатель",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.CASCADE,
        related_name="operations",
        verbose_name="Продукт",
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=3, verbose_name="Количество")
    unit = models.CharField(max_length=20, verbose_name="Единица измерения")
    price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Цена"
    )

    class Meta:
        verbose_name = "Операция"
        verbose_name_plural = "Операции"
        ordering = ["-date", "-time"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["kitchen"]),
            models.Index(fields=["product"]),
            models.Index(fields=["type"]),
            models.Index(fields=["organization", "date"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_type_display()} — {self.product} ({self.quantity} {self.unit})"
