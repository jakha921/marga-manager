from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView,
    MeView,
    PasswordResetRequestCreateView,
    PasswordResetRequestViewSet,
    RegisterView,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register(
    "auth/password-reset-requests",
    PasswordResetRequestViewSet,
    basename="password-reset-requests",
)

urlpatterns = [
    path("login/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("register/", RegisterView.as_view(), name="register"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path(
        "password-reset-request/",
        PasswordResetRequestCreateView.as_view(),
        name="password-reset-request",
    ),
]

# Users endpoint at /api/users/
user_urlpatterns = router.urls
