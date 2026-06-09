from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.db.models import QuerySet

logger = logging.getLogger("apps.core")


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
            if not user.organization:
                logger.warning("user %s has no org, returning qs.none()", user.id)
                return qs.none()
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
            from rest_framework.exceptions import ValidationError

            from apps.organizations.models import Organization

            try:
                org = Organization.objects.get(pk=org_id)
            except Organization.DoesNotExist:
                raise ValidationError({"organization": f"Организация с id={org_id} не найдена."})
            serializer.save(organization=org)
        elif user.organization:
            serializer.save(organization=user.organization)
        else:
            logger.warning("user %s has no org, saving without organization", user.id)
            serializer.save()
