from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    """Админка для категорий."""

    list_display = ["name", "organization", "created_at"]
    list_filter = ["organization"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    """Админка для продуктов."""

    list_display = ["code", "name", "category", "unit", "organization"]
    list_filter = ["category", "unit", "organization"]
    search_fields = ["code", "name"]
    readonly_fields = ["created_at", "updated_at"]
