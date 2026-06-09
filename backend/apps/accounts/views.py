import logging

from rest_framework import generics, permissions, viewsets
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.core.mixins import TenantCreateMixin, TenantQuerySetMixin
from apps.core.permissions import IsTenantAdmin

from .models import User
from .serializers import (
    CustomTokenObtainPairSerializer,
    MeSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from .throttles import LoginRateThrottle

logger = logging.getLogger("apps.accounts")


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        username = request.data.get("username", "")
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


class UserViewSet(TenantQuerySetMixin, TenantCreateMixin, viewsets.ModelViewSet):
    """CRUD пользователей. Только TENANT_ADMIN+ может управлять."""

    queryset = User.objects.select_related("organization").all()
    permission_classes = [IsTenantAdmin]
    filterset_fields = ["role", "is_active"]
    search_fields = ["username", "full_name"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        logger.info("User created: %s by %s", instance.username, self.request.user.username)

    def perform_destroy(self, instance):
        logger.info("User deleted: id=%s by %s", instance.id, self.request.user.username)
        instance.delete()
