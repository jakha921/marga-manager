from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models import QuerySet


class TenantQuerySetMixin:
    """Авто-фильтрация queryset по организации текущего пользователя."""

    def get_queryset(self) -> QuerySet:
        qs = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return qs.none()

        # SUPER_ADMIN видит всё
        if user.role == "SUPER_ADMIN":
            return qs

        # Остальные видят только свою организацию
        if hasattr(qs.model, "organization"):
            return qs.filter(organization=user.organization)

        return qs


class TenantCreateMixin:
    """Авто-установка организации при создании объекта."""

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(serializer.Meta.model, "organization"):
            serializer.save()
            return

        # SUPER_ADMIN может передать organization_id в request.data
        org_id = self.request.data.get("organization")
        if user.role == "SUPER_ADMIN" and org_id:
            from apps.organizations.models import Organization

            org = Organization.objects.get(pk=org_id)
            serializer.save(organization=org)
        elif user.organization:
            serializer.save(organization=user.organization)
        else:
            serializer.save()
