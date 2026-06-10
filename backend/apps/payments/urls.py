from django.urls import path
from rest_framework.routers import DefaultRouter

from .payme_views import PaymeWebhookView
from .views import AuditLogViewSet, OrderViewSet, PlanConfigListView, SubscriptionListView

router = DefaultRouter()
router.register("payments/orders", OrderViewSet, basename="payment-orders")
router.register("payments/audit-logs", AuditLogViewSet, basename="audit-logs")

# Public endpoint (no auth) — must come before router.urls to avoid pk capture
urlpatterns = [
    path("payments/payme/", PaymeWebhookView.as_view(), name="payme-webhook"),
    path("payments/plans/", PlanConfigListView.as_view(), name="plan-config-list"),
    path("payments/subscriptions/", SubscriptionListView.as_view(), name="subscription-list"),
] + router.urls
