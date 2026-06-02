from django.urls import path
from rest_framework.routers import DefaultRouter

from .payme_views import PaymeWebhookView
from .views import OrderViewSet, PlanConfigListView

router = DefaultRouter()
router.register("payments/orders", OrderViewSet, basename="payment-orders")

urlpatterns = [
    path("payments/payme/", PaymeWebhookView.as_view(), name="payme-webhook"),
    path("payments/plans/", PlanConfigListView.as_view(), name="plan-config-list"),
] + router.urls
