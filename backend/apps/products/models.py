from django.db import models

from apps.core.models import TenantModel


class Category(TenantModel):
    """Категория продуктов."""

    name = models.CharField(max_length=200, verbose_name="Название")

    class Meta:
        verbose_name = "Категория"
        verbose_name_plural = "Категории"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Product(TenantModel):
    """Продукт/ингредиент на складе."""

    code = models.CharField(max_length=50, verbose_name="Код")
    name = models.CharField(max_length=200, verbose_name="Название")
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
        verbose_name="Категория",
    )
    unit = models.CharField(max_length=20, verbose_name="Единица измерения")

    class Meta:
        verbose_name = "Продукт"
        verbose_name_plural = "Продукты"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "code"],
                name="unique_product_code_per_org",
            )
        ]

    def __str__(self) -> str:
        return f"{self.code} — {self.name}"
