from django.urls import path
from rest_framework.routers import DefaultRouter

from .payme_views import PaymeWebhookView
from .views import OrderViewSet

router = DefaultRouter()
router.register("payments/orders", OrderViewSet, basename="payment-orders")

urlpatterns = [
    path("payments/payme/", PaymeWebhookView.as_view(), name="payme-webhook"),
] + router.urls
