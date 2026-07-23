from django.urls import path

from .views import (
    KitchenReportView,
    OperationsSummaryView,
    ProductConsumptionView,
    SalesChartView,
)

urlpatterns = [
    path("sales-chart/", SalesChartView.as_view(), name="analytics-sales-chart"),
    path(
        "product-consumption/<int:product_id>/",
        ProductConsumptionView.as_view(),
        name="analytics-product-consumption",
    ),
    path("kitchen-report/", KitchenReportView.as_view(), name="analytics-kitchen-report"),
    path(
        "operations-summary/",
        OperationsSummaryView.as_view(),
        name="analytics-operations-summary",
    ),
]
