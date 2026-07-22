import logging

from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.audit import create_audit_log
from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsTenantAdmin
from apps.payments.models import AuditLog

from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    MeSerializer,
    RegisterSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from .throttles import LoginRateThrottle, SignupRateThrottle

logger = logging.getLogger("apps.accounts")


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        raw = request.data.get("username", "")
        # Strip control chars to prevent log injection (CWE-117)
        username = str(raw).replace("\r", "").replace("\n", "")[:64]
        ip = request.META.get("REMOTE_ADDR")
        if response.status_code == 200:
            logger.info("Login success: user=%s ip=%s", username, ip)
        else:
            logger.warning(
                "Login failed: user=%s ip=%s status=%s", username, ip, response.status_code
            )
        return response


class MeView(generics.RetrieveAPIView):
    """GET /api/auth/me/ — текущий пользователь."""

    serializer_class = MeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class RegisterView(generics.GenericAPIView):
    """POST /api/auth/register/ — creates organization and owner account."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [SignupRateThrottle]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save(), status=status.HTTP_201_CREATED)


class UserViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD пользователей. Только TENANT_ADMIN+ может управлять."""

    queryset = User.objects.select_related("organization").order_by("id")
    permission_classes = [IsTenantAdmin]
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "full_name"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = self.request.user
        org = user.organization
        if user.role != "SUPER_ADMIN" and org:
            from django.db import transaction
            from rest_framework.exceptions import PermissionDenied

            from apps.organizations.models import Organization

            # Блокировка строки организации делает проверку лимита и insert атомарными
            with transaction.atomic():
                locked = Organization.objects.select_for_update().get(pk=org.pk)
                if not locked.can_add_user():
                    raise PermissionDenied(f"Достигнут лимит пользователей ({locked.max_users}).")
                super().perform_create(serializer)
        else:
            super().perform_create(serializer)
        instance = serializer.instance
        logger.info("User created: %s by %s", instance.username, user.username)
        create_audit_log(
            AuditLog.EventType.USER_CREATED,
            actor=user,
            organization=instance.organization,
            target_type="User",
            target_id=instance.id,
            new_value={"username": instance.username, "role": instance.role},
        )

    def perform_destroy(self, instance):
        logger.info("User deleted: id=%s by %s", instance.id, self.request.user.username)
        create_audit_log(
            AuditLog.EventType.USER_DELETED,
            actor=self.request.user,
            organization=instance.organization,
            target_type="User",
            target_id=instance.id,
            old_value={"username": instance.username, "role": instance.role},
        )
        instance.delete()
