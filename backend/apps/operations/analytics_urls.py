from django.urls import path

from .views import (
    DashboardView,
    KitchenReportView,
    OperationsSummaryView,
    ProductHistoryView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="analytics-dashboard"),
    path(
        "product-history/<int:product_id>/",
        ProductHistoryView.as_view(),
        name="analytics-product-history",
    ),
    path("kitchen-report/", KitchenReportView.as_view(), name="analytics-kitchen-report"),
    path(
        "operations-summary/",
        OperationsSummaryView.as_view(),
        name="analytics-operations-summary",
    ),
]
