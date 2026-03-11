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


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


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
